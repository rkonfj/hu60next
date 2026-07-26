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
  const content = String(form.get("content") ?? "").trim();
  const token = String(form.get("token") ?? "");

  if (!content || content.length > 20000 || !/^[a-f0-9]{32}$/i.test(token)) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的聊天内容。" },
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
    const upstream = await fetch(
      `${API_BASE}/addin.chat.%E5%85%AC%E5%85%B1%E8%81%8A%E5%A4%A9%E5%AE%A4.json`,
      {
        method: "POST",
        headers,
        body: new URLSearchParams({ content, token, go: "1" }),
        cache: "no-store"
      }
    );
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
          result.notice || (success ? "消息已发送。" : "消息发送失败。")
      },
      {
        status: success ? 200 : upstream.ok ? 400 : upstream.status,
        headers: { "cache-control": "private, no-store" }
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接聊天室。" },
      { status: 502 }
    );
  }
}
