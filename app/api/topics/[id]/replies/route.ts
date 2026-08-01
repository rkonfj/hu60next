import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseReverseOverride } from "@/lib/floor-order";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";
import { withHu60MarkdownMarker } from "@/lib/markdown";
import { topicFloorHref } from "@/lib/topic-navigation";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isDocumentSubmission(request: Request) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function getPublicOrigin(request: Request) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const requestUrl = new URL(request.url);
  const host = forwardedHost || request.headers.get("host");
  const protocol =
    forwardedProtocol || requestUrl.protocol.replace(/:$/, "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
}

function replyDestination(
  topicId: number,
  upstreamUrl?: string,
  reverseOverride?: boolean
) {
  const floorMatch = upstreamUrl?.match(/[?&]floor=(\d+)/);
  const floor = Number(floorMatch?.[1]);

  if (!Number.isInteger(floor) || floor < 1) return null;

  return {
    floor,
    page: null,
    nextPath: topicFloorHref(topicId, floor, reverseOverride)
  };
}

function failure(
  request: Request,
  topicId: number,
  notice: string,
  status: number
) {
  if (isDocumentSubmission(request)) {
    const url = new URL(`/topic/${topicId}`, getPublicOrigin(request));
    url.searchParams.set("replyError", "1");
    url.hash = "quick-reply";
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.json({ success: false, notice }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const topicId = Number(id);
  const form = await request.formData();
  const rawContent = String(form.get("content") ?? "").trim();
  const content = withHu60MarkdownMarker(rawContent);
  const token = String(form.get("token") ?? "");
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!Number.isInteger(topicId) || topicId < 1) {
    return NextResponse.json(
      { success: false, notice: "帖子地址无效。" },
      { status: 400 }
    );
  }

  if (!sid) {
    if (isDocumentSubmission(request)) {
      const url = new URL("/login", getPublicOrigin(request));
      url.searchParams.set("next", `/topic/${topicId}`);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json(
      { success: false, notice: "登录状态已失效，请重新登录。" },
      { status: 401 }
    );
  }

  if (!rawContent || content.length > 20000 || !token) {
    return failure(request, topicId, "请输入有效的回复内容。", 400);
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
      `${API_BASE}/bbs.newreply.${topicId}.json`,
      {
        method: "POST",
        headers,
        body: new URLSearchParams({
          content,
          token,
          go: "1"
        }),
        cache: "no-store"
      }
    );
    const data = (await upstream.json()) as {
      success?: boolean;
      notice?: string;
      error?: string | boolean;
      url?: string;
    };

    if (!upstream.ok || data.success !== true || data.error) {
      return failure(
        request,
        topicId,
        data.notice || "回复失败，请稍后再试。",
        upstream.ok ? 400 : upstream.status
      );
    }

    const reverseOverride = parseReverseOverride(
      String(form.get("reverse") ?? "")
    );
    const destination = replyDestination(topicId, data.url, reverseOverride);

    if (isDocumentSubmission(request)) {
      const url = new URL(
        destination?.nextPath ?? `/topic/${topicId}#replies`,
        getPublicOrigin(request)
      );
      return NextResponse.redirect(url, 303);
    }

    return NextResponse.json({
      success: true,
      ...(destination ?? {})
    });
  } catch {
    return failure(request, topicId, "暂时无法提交回复，请稍后再试。", 502);
  }
}
