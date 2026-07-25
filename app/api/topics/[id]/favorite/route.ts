import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

async function updateFavorite(
  context: { params: Promise<{ id: string }> },
  action: "set" | "unset"
) {
  const { id } = await context.params;
  const topicId = Number(id);

  if (!Number.isInteger(topicId) || topicId <= 0) {
    return NextResponse.json(
      { success: false, notice: "主题参数无效。" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetch(
      `${API_BASE}/bbs.${action}favoritetopic.${topicId}.json`,
      {
        headers: {
          accept: "application/json",
          "user-agent": "Hulvlin-Next/0.1",
          "x-origin": "*",
          "x-sid": sid
        },
        cache: "no-store",
        redirect: "manual"
      }
    );

    if (!upstream.ok || upstream.status >= 300) {
      return NextResponse.json(
        { success: false, notice: "登录状态已失效，请重新登录。" },
        { status: upstream.status === 401 ? 401 : 502 }
      );
    }

    const result = (await upstream.json()) as {
      success?: boolean;
      notice?: string;
    };

    return NextResponse.json(
      {
        success: result.success === true,
        notice:
          result.notice ||
          (result.success
            ? action === "set"
              ? "已加入收藏。"
              : "已取消收藏。"
            : action === "set"
              ? "收藏失败，请稍后再试。"
              : "取消收藏失败，请稍后再试。")
      },
      { status: result.success === true ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        notice:
          action === "set"
            ? "暂时无法连接收藏服务。"
            : "暂时无法连接取消收藏服务。"
      },
      { status: 502 }
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return updateFavorite(context, "set");
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return updateFavorite(context, "unset");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action !== "set" && action !== "unset") {
    return NextResponse.json(
      { success: false, notice: "收藏操作无效。" },
      { status: 400 }
    );
  }

  const response = await updateFavorite(context, action);

  if (!request.headers.get("accept")?.includes("text/html")) {
    return response;
  }

  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  if (response.status === 401) {
    const loginParams = new URLSearchParams({ next });
    return new NextResponse(null, {
      status: 303,
      headers: { location: `/login?${loginParams.toString()}` }
    });
  }

  return new NextResponse(null, {
    status: 303,
    headers: { location: next }
  });
}
