import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

const actions = new Set(["follow", "unfollow", "block", "unblock"]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const targetUid = Number(id);
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }
  if (!Number.isInteger(targetUid) || targetUid <= 0 || !actions.has(action)) {
    return NextResponse.json(
      { success: false, notice: "用户关系操作无效。" },
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
    const upstream = await fetch(`${API_BASE}/user.relationship.json`, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        action,
        targetUid: String(targetUid)
      }),
      cache: "no-store"
    });
    const data = (await upstream.json()) as {
      success?: boolean;
      message?: string;
    };
    return NextResponse.json(
      {
        success: upstream.ok && data.success === true,
        notice:
          data.message ||
          (data.success ? "操作成功。" : "操作失败，请稍后重试。")
      },
      { status: upstream.ok && data.success === true ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接用户关系服务。" },
      { status: 502 }
    );
  }
}
