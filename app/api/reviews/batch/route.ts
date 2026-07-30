import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { floorReverseFlag } from "@/lib/floor-order";
import {
  getReviewQueue,
  getTopic,
  getUserStatus
} from "@/lib/hu60";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";
import type { ReviewQueueFilter } from "@/lib/hu60";
import type { Floor, UserReply } from "@/lib/types";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";
const MAX_BATCH_SIZE = 50;
const MAX_REASON_LENGTH = 500;

type ReviewDecision = "pass" | "reject";

type ReviewRequestItem = {
  contentId: number;
  decision: ReviewDecision;
  reason: string;
};

type ReviewContext =
  | {
      type: "queue";
      page: number;
      filter: ReviewQueueFilter;
    }
  | {
      type: "topic";
      topicId: number;
      page: number;
      floorReverse?: boolean;
    };

type ReviewRequest = {
  context: ReviewContext;
  items: ReviewRequestItem[];
};

type ReviewTarget = Pick<
  UserReply | Floor,
  "id" | "topic_id" | "floor" | "review"
>;

function failure(notice: string, status: number) {
  return NextResponse.json({ success: false, notice }, { status });
}

function isSameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      .trim();
    const host = forwardedHost || request.headers.get("host");
    return Boolean(host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

function isReviewFilter(value: unknown): value is ReviewQueueFilter {
  return value === "pending" || value === "mine" || value === "rejected";
}

function parseRequest(value: unknown): ReviewRequest | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Partial<ReviewRequest>;
  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > MAX_BATCH_SIZE ||
    !body.context ||
    typeof body.context !== "object"
  ) {
    return null;
  }

  const contentIds = new Set<number>();
  for (const item of body.items) {
    if (
      !item ||
      !Number.isInteger(Number(item.contentId)) ||
      Number(item.contentId) < 1 ||
      (item.decision !== "pass" && item.decision !== "reject") ||
      typeof item.reason !== "string"
    ) {
      return null;
    }

    const contentId = Number(item.contentId);
    const reason = item.reason.trim();
    if (
      (item.decision === "reject" && !reason) ||
      reason.length > MAX_REASON_LENGTH ||
      contentIds.has(contentId)
    ) {
      return null;
    }
    contentIds.add(contentId);
  }

  if (body.context.type === "queue") {
    if (
      !Number.isInteger(Number(body.context.page)) ||
      Number(body.context.page) < 1 ||
      !isReviewFilter(body.context.filter)
    ) {
      return null;
    }
  } else if (body.context.type === "topic") {
    if (
      !Number.isInteger(Number(body.context.topicId)) ||
      Number(body.context.topicId) < 1 ||
      !Number.isInteger(Number(body.context.page)) ||
      Number(body.context.page) < 1
    ) {
      return null;
    }
  } else {
    return null;
  }

  return {
    context: body.context,
    items: body.items.map((item) => {
      const reason = item.reason.trim();
      return {
        contentId: Number(item.contentId),
        decision: item.decision,
        reason: item.decision === "pass" && !reason ? "通过" : reason
      };
    })
  } as ReviewRequest;
}

async function getAuthoritativeTargets(
  context: ReviewContext,
  sid: string
): Promise<ReviewTarget[] | null> {
  if (context.type === "queue") {
    const queue = await getReviewQueue(
      context.page,
      sid,
      context.filter
    );
    return queue.__fallback ? null : queue.replyList;
  }

  const topic = await getTopic(context.topicId, context.page, sid, {
    floorReverse: floorReverseFlag(Boolean(context.floorReverse))
  });
  return topic.__fallback ? null : topic.tContents;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return failure("请求来源无效。", 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return failure("审核请求格式无效。", 415);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return failure("审核请求格式无效。", 400);
  }

  const body = parseRequest(rawBody);
  if (!body) {
    return failure("请选择有效内容并填写审核理由。", 400);
  }

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) return failure("登录状态已失效，请重新登录。", 401);

  const session = await getUserStatus(sid);
  if (
    session.isLogin !== true ||
    !session.permissions?.includes("PERMISSION_REVIEW_POST")
  ) {
    return failure("你没有审核权限。", 403);
  }

  const targets = await getAuthoritativeTargets(body.context, sid);
  if (!targets) {
    return failure("暂时无法核对待审核内容，请稍后重试。", 502);
  }

  const targetMap = new Map(
    targets.map((target) => [Number(target.id), target])
  );
  const upstreamItems: Array<{
    contentId: number;
    topicId: number;
    pass: boolean;
    comment: string;
  }> = [];
  const results = body.items.map((item) => {
    const target = targetMap.get(item.contentId);
    if (!target || Number(target.review || 0) === 0) {
      return {
        contentId: item.contentId,
        decision: item.decision,
        reason: item.reason,
        success: false,
        notice: "内容状态已变化，请刷新后重试。"
      };
    }

    upstreamItems.push({
      contentId: item.contentId,
      topicId:
        Number(target.floor) === 0 ? Number(target.topic_id) : 0,
      pass: item.decision === "pass",
      comment: item.reason
    });

    return {
      contentId: item.contentId,
      decision: item.decision,
      reason: item.reason,
      success: false,
      notice: ""
    };
  });

  if (!upstreamItems.length) {
    return NextResponse.json({ success: false, results });
  }

  try {
    const { headers } = createHu60UpstreamHeaders(request.headers, {
      accept: "application/json",
      "content-type": "application/json;charset=UTF-8",
      "user-agent": "Hulvlin-Next/0.1",
      "x-origin": "*",
      "x-sid": sid
    });
    const upstream = await fetch(`${API_BASE}/bbs.review-all.json`, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamItems),
      cache: "no-store"
    });
    const data = (await upstream.json()) as
      | Array<{
          success?: boolean;
          errmsg?: string | null;
          errcode?: number | null;
        }>
      | { errInfo?: string };

    if (!upstream.ok || !Array.isArray(data)) {
      return failure(
        !Array.isArray(data) && data.errInfo
          ? data.errInfo
          : "上游审核服务暂时不可用。",
        upstream.ok ? 502 : upstream.status
      );
    }

    let upstreamCursor = 0;
    for (let index = 0; index < results.length; index += 1) {
      if (results[index].notice) continue;
      const itemResult = data[upstreamCursor];
      upstreamCursor += 1;
      results[index] = {
        ...results[index],
        success: itemResult?.success === true,
        notice:
          itemResult?.success === true
            ? "审核已提交。"
            : itemResult?.errmsg || "审核失败，内容可能已被其他人处理。"
      };
    }

    return NextResponse.json({
      success: results.every((result) => result.success),
      results
    });
  } catch {
    return failure("暂时无法提交审核，请稍后重试。", 502);
  }
}
