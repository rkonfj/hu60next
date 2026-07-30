import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  FLOOR_ORDER_COOKIE,
  isFloorReverseEnabled
} from "@/lib/floor-order";
import { setAccountFloorReverse } from "@/lib/hu60";

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
    const account = await setAccountFloorReverse(floorReverse, sid);
    if (account.__fallback) {
      return NextResponse.json(
        {
          success: false,
          notice: account.__error?.message || "楼层排序偏好保存失败，请稍后重试。"
        },
        { status: 502 }
      );
    }

    const response = NextResponse.json({
      success: true,
      notice: "默认楼层排序已保存。",
      floorReverse: isFloorReverseEnabled(account.floorReverse)
    });
    response.cookies.set(FLOOR_ORDER_COOKIE, floorReverse ? "1" : "0", {
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
