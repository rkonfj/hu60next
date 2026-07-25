import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
  const avatar = form.get("avatar");
  if (!(avatar instanceof File)) {
    return NextResponse.json(
      { success: false, notice: "请选择 JPEG 头像。" },
      { status: 400 }
    );
  }
  if (avatar.type !== "image/jpeg" || avatar.size > 512 * 1024) {
    return NextResponse.json(
      { success: false, notice: "头像必须是 512KB 以内的 JPEG 图片。" },
      { status: 400 }
    );
  }

  try {
    const body = new FormData();
    body.set("avatar", avatar, "avatar.jpg");
    const upstream = await fetch(`${API_BASE}/user.avatar.json`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "user-agent": "Hulvlin-Next/0.1",
        "x-sid": sid
      },
      body,
      cache: "no-store"
    });
    const data = (await upstream.json()) as {
      error?: string;
      message?: string;
    };
    if (!upstream.ok || data.error || !data.message) {
      return NextResponse.json(
        {
          success: false,
          notice: data.error || data.message || "头像上传失败。"
        },
        { status: upstream.ok ? 400 : 502 }
      );
    }
    return NextResponse.json({ success: true, notice: data.message });
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接头像服务。" },
      { status: 502 }
    );
  }
}
