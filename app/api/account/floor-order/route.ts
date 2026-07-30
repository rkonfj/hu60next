import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  FLOOR_ORDER_COOKIE,
  isFloorReverseEnabled
} from "@/lib/floor-order";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  const form = await request.formData();
  const floorReverse = isFloorReverseEnabled(form.get("floorReverse"));

  try {
    const { headers } = createHu60UpstreamHeaders(request.headers, {
      accept: "application/json",
      "user-agent": "Hulvlin-Next/0.1",
      "x-sid": sid
    });
    const upstream = await fetch(
      `${API_BASE}/user.index.json?${new URLSearchParams({
        floorReverse: floorReverse ? "1" : "0",
        _time: String(Math.floor(Date.now() / 1000))
      }).toString()}`,
      {
        headers,
        cache: "no-store"
      }
    );
    const data = (await upstream.json()) as {
      uid?: number;
      floorReverse?: boolean | number | string;
      error?: string | boolean;
      notice?: string;
      message?: string;
    };

    if (!upstream.ok || data.error || !data.uid) {
      return NextResponse.json(
        {
          success: false,
          notice:
            data.notice ||
            data.message ||
            (typeof data.error === "string" ? data.error : "楼层排序偏好保存失败，请稍后重试。")
        },
        { status: upstream.ok ? 400 : 502 }
      );
    }

    const savedFloorReverse = isFloorReverseEnabled(data.floorReverse);
    const response = NextResponse.json({
      success: true,
      notice: savedFloorReverse ? "默认排序已设为倒序。" : "默认排序已设为正序。",
      floorReverse: savedFloorReverse
    });
    response.cookies.set(FLOOR_ORDER_COOKIE, savedFloorReverse ? "1" : "0", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax"
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接账号服务。" },
      { status: 502 }
    );
  }
}
