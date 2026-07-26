import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

function isDocumentSubmission(request: Request) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function getPublicOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const host = forwardedHost || request.headers.get("host");
  const protocol =
    forwardedProtocol || requestUrl.protocol.replace(/:$/, "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
}

function failure(request: Request, notice: string, status: number) {
  if (isDocumentSubmission(request)) {
    const url = new URL("/compose", getPublicOrigin(request));
    url.searchParams.set("publishError", "1");
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.json({ success: false, notice }, { status });
}

function findTopicId(data: Record<string, unknown>) {
  const candidates = [
    data.topic_id,
    data.topicId,
    data.tid,
    data.id,
    data.topic && typeof data.topic === "object"
      ? (data.topic as Record<string, unknown>).id
      : null
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isInteger(value) && value > 0) return value;
  }

  for (const value of Object.values(data)) {
    if (typeof value !== "string") continue;
    const match = value.match(/bbs\.topic\.(\d+)|\/topic\/(\d+)/);
    if (match) return Number(match[1] || match[2]);
  }

  return null;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure(request, "提交的数据格式不正确。", 400);
  }
  const forumId = Number(form.get("forumId"));
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!sid) {
    if (isDocumentSubmission(request)) {
      const url = new URL("/login", getPublicOrigin(request));
      url.searchParams.set("next", "/compose");
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json(
      { success: false, notice: "登录状态已失效，请重新登录。" },
      { status: 401 }
    );
  }

  if (
    !Number.isInteger(forumId) ||
    forumId < 1 ||
    !title ||
    title.length > 120 ||
    !content ||
    content.length > 20000
  ) {
    return failure(request, "请选择板块并填写有效的标题和正文。", 400);
  }

  try {
    const { headers: tokenHeaders } = createHu60UpstreamHeaders(
      request.headers,
      {
        accept: "application/json",
        "user-agent": "Hulvlin-Next/0.1",
        "x-origin": "*",
        "x-sid": sid
      }
    );
    const tokenResponse = await fetch(
      `${API_BASE}/bbs.newtopic.${forumId}.json`,
      {
        headers: tokenHeaders,
        cache: "no-store"
      }
    );
    const tokenData = (await tokenResponse.json()) as {
      isLogin?: boolean | null;
      token?: string;
      error?: string | boolean;
      notice?: string;
    };
    const token =
      typeof tokenData.token === "string" ? tokenData.token : "";

    if (
      !tokenResponse.ok ||
      tokenData.error ||
      tokenData.isLogin !== true ||
      !token
    ) {
      return failure(
        request,
        tokenData.isLogin === false
          ? "登录状态已失效，请重新登录。"
          : tokenData.notice || "暂时无法获取发帖凭证，请稍后再试。",
        tokenData.isLogin === false ? 401 : 502
      );
    }

    const { headers } = createHu60UpstreamHeaders(request.headers, {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "Hulvlin-Next/0.1",
      "x-origin": "*",
      "x-sid": sid
    });
    const upstream = await fetch(
      `${API_BASE}/bbs.newtopic.${forumId}.json`,
      {
        method: "POST",
        headers,
        body: new URLSearchParams({
          title,
          content,
          token,
          useMarkdown: "1",
          go: "1"
        }),
        cache: "no-store"
      }
    );
    const data = (await upstream.json()) as Record<string, unknown>;

    if (!upstream.ok || data.success !== true || data.error) {
      return failure(
        request,
        typeof data.notice === "string"
          ? data.notice
          : "发布失败，请稍后再试。",
        upstream.ok ? 400 : upstream.status
      );
    }

    const topicId = findTopicId(data);
    const nextPath = topicId ? `/topic/${topicId}` : `/forum/${forumId}`;

    if (isDocumentSubmission(request)) {
      return NextResponse.redirect(
        new URL(nextPath, getPublicOrigin(request)),
        303
      );
    }

    return NextResponse.json({
      success: true,
      topicId,
      forumId
    });
  } catch {
    return failure(request, "暂时无法提交主题，请稍后再试。", 502);
  }
}
