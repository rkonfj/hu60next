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

  const form = await request.formData().catch(() => new FormData());
  const name = String(form.get("name") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();

  if (!name || name.length > 60 || !content || content.length > 20000) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的收件人和私信内容。" },
      { status: 400 }
    );
  }

  try {
    const { headers } = createHu60UpstreamHeaders(request.headers, {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "Hulvlin-Next/0.1",
      "x-origin": "*",
      "x-sid": sid
    });
    const upstream = await fetch(`${API_BASE}/msg.index.send..json`, {
      method: "POST",
      headers,
      body: new URLSearchParams({ name, content, go: "1" }),
      cache: "no-store"
    });
    const result = (await upstream.json()) as {
      success?: boolean;
      notice?: string;
      error?: string | boolean;
    };
    const success = upstream.ok && result.success === true && !result.error;

    return NextResponse.json(
      {
        success,
        notice:
          result.notice ||
          (success ? "私信已发送。" : "私信发送失败，请检查用户名。")
      },
      {
        status: success ? 200 : upstream.ok ? 400 : upstream.status,
        headers: { "cache-control": "private, no-store" }
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接私信服务。" },
      { status: 502 }
    );
  }
}
