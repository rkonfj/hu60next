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

  const form = await request.formData().catch(() => new FormData());
  const rawType = form.get("type");
  if (rawType !== "0" && rawType !== "1") {
    return NextResponse.json(
      { success: false, notice: "消息类型无效。" },
      { status: 400 }
    );
  }
  const type = Number(rawType);

  try {
    const upstream = await fetch(`${API_BASE}/api.msg.isread.set.json`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json;charset=UTF-8",
        "user-agent": "Hulvlin-Next/0.1",
        "x-origin": "*",
        "x-sid": sid
      },
      body: JSON.stringify({ type }),
      cache: "no-store"
    });
    const result = (await upstream.json()) as {
      result?: { update?: number } | false;
      error?: string | boolean;
    };
    const success = upstream.ok && result.result !== false && !result.error;
    const update =
      result.result && typeof result.result === "object"
        ? Number(result.result.update ?? 0)
        : 0;

    return NextResponse.json(
      {
        success,
        notice: success ? `已将 ${update} 条消息设为已读。` : "操作失败。"
      },
      {
        status: success ? 200 : upstream.ok ? 400 : upstream.status,
        headers: { "cache-control": "private, no-store" }
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法更新消息状态。" },
      { status: 502 }
    );
  }
}
