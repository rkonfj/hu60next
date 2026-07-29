import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
  const newName = String(form.get("newName") ?? "").trim();
  if (!newName || Array.from(newName).length > 16) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的新用户名。" },
      { status: 400 }
    );
  }

  try {
    const { headers } = createHu60UpstreamHeaders(request.headers, {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "Hulvlin-Next/0.1",
      "x-sid": sid
    });
    const upstream = await fetch(`${API_BASE}/user.chname.json`, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        newName,
        go: "1"
      }),
      cache: "no-store"
    });
    const data = (await upstream.json()) as {
      success?: boolean;
      notice?: string;
    };
    if (!upstream.ok || data.success !== true) {
      return NextResponse.json(
        {
          success: false,
          notice: data.notice || "用户名修改失败，请稍后重试。"
        },
        { status: upstream.ok ? 400 : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      notice: "用户名已修改。"
    });
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接用户名服务。" },
      { status: 502 }
    );
  }
}
