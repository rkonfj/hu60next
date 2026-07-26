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
  const oldPassword = String(form.get("oldPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");

  if (!oldPassword || !newPassword || newPassword !== confirmPassword) {
    return NextResponse.json(
      { success: false, notice: "请检查原密码和两次新密码。" },
      { status: 400 }
    );
  }
  if (oldPassword.length > 200 || newPassword.length > 200) {
    return NextResponse.json(
      { success: false, notice: "密码内容过长。" },
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
    const upstream = await fetch(`${API_BASE}/user.chpwd.json`, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        step: "2",
        oldPassword,
        newPassword,
        newPasswordAgain: confirmPassword,
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
          notice: data.notice || "密码修改失败，请检查原密码。"
        },
        { status: upstream.ok ? 400 : 502 }
      );
    }

    const response = NextResponse.json({
      success: true,
      notice: "密码已修改，请重新登录。"
    });
    response.cookies.set("hulvlin_sid", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接密码服务。" },
      { status: 502 }
    );
  }
}
