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
  const signature = String(form.get("signature") ?? "");
  const contact = String(form.get("contact") ?? "");
  if (signature.length > 1000 || contact.length > 1000) {
    return NextResponse.json(
      { success: false, notice: "签名或联系方式内容过长。" },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(`${API_BASE}/user.chinfo.json`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "Hulvlin-Next/0.1",
        "x-sid": sid
      },
      body: new URLSearchParams({
        signature,
        contact,
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
          notice: data.notice || "资料保存失败，请稍后重试。"
        },
        { status: upstream.ok ? 400 : 502 }
      );
    }
    return NextResponse.json({ success: true, notice: "个人资料已保存。" });
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接资料服务。" },
      { status: 502 }
    );
  }
}
