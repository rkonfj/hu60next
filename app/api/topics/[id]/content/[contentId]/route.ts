import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { EditPostFormResponse } from "@/lib/types";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

type RouteContext = {
  params: Promise<{ id: string; contentId: string }>;
};

function jsonFailure(notice: string, status: number) {
  return NextResponse.json({ success: false, notice }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id, contentId } = await params;
  const topicId = Number(id);
  const postContentId = Number(contentId);

  if (
    !Number.isInteger(topicId) ||
    topicId < 1 ||
    !Number.isInteger(postContentId) ||
    postContentId < 1
  ) {
    return jsonFailure("帖子地址无效。", 400);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonFailure("提交的数据格式不正确。", 400);
  }

  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "");
  const editReason = String(form.get("editReason") ?? "").trim();
  const requestedPage = Math.max(1, Number(form.get("page")) || 1);
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!sid) {
    return jsonFailure("登录状态已失效，请重新登录。", 401);
  }

  if (title.length > 120 || content.length > 20000) {
    return jsonFailure("标题或正文超过长度限制。", 400);
  }

  const upstreamPath =
    `bbs.edittopic.${topicId}.${postContentId}.${requestedPage}.json`;

  try {
    const tokenResponse = await fetch(`${API_BASE}/${upstreamPath}`, {
      headers: {
        accept: "application/json",
        "user-agent": "Hulvlin-Next/0.1",
        "x-origin": "*",
        "x-sid": sid
      },
      cache: "no-store"
    });
    const tokenData =
      (await tokenResponse.json()) as EditPostFormResponse & {
        error?: string | boolean;
      };
    const token =
      typeof tokenData.token === "string" ? tokenData.token : "";

    if (
      !tokenResponse.ok ||
      tokenData.error ||
      tokenData.success === false ||
      tokenData.isLogin !== true ||
      !token
    ) {
      return jsonFailure(
        tokenData.isLogin === false
          ? "登录状态已失效，请重新登录。"
          : tokenData.notice || "你没有修改这个楼层的权限。",
        tokenData.isLogin === false ? 401 : 403
      );
    }

    if (tokenData.editTitle && !title) {
      return jsonFailure("标题不能为空。", 400);
    }
    if (tokenData.needReason && !editReason) {
      return jsonFailure("请填写编辑理由。", 400);
    }

    const body = new URLSearchParams({
      content,
      token,
      go: "1"
    });
    if (tokenData.editTitle) body.set("title", title);
    if (tokenData.needReason) body.set("editReason", editReason);

    const upstream = await fetch(`${API_BASE}/${upstreamPath}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type":
          "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "Hulvlin-Next/0.1",
        "x-origin": "*",
        "x-sid": sid
      },
      body,
      cache: "no-store"
    });
    const result = (await upstream.json()) as {
      success?: boolean;
      notice?: string;
      error?: string | boolean;
    };

    if (!upstream.ok || result.error || result.success !== true) {
      return jsonFailure(
        result.notice || "保存修改失败，请稍后重试。",
        upstream.ok ? 400 : upstream.status
      );
    }

    const floor = Number(tokenData.floorMeta?.floor ?? 0);
    const query = requestedPage > 1 ? `?page=${requestedPage}` : "";
    const hash = floor > 0 ? `#floor-${floor}` : "";

    return NextResponse.json({
      success: true,
      nextPath: `/topic/${topicId}${query}${hash}`
    });
  } catch {
    return jsonFailure("暂时无法保存修改，请稍后重试。", 502);
  }
}
