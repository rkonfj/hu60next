import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserStatus } from "@/lib/hu60";
import {
  castTopicVote,
  getTopicVote,
  VoteStoreError
} from "@/lib/votes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ topicId: string }>;
};

function responseForError(error: unknown) {
  if (!(error instanceof VoteStoreError)) {
    return NextResponse.json(
      { success: false, notice: "投票服务暂时不可用。" },
      { status: 500 }
    );
  }

  const status = {
    NOT_FOUND: 404,
    INVALID_DATA: 422,
    INVALID_SELECTION: 400,
    ALREADY_VOTED: 409,
    CLOSED: 409,
    BUSY: 503
  }[error.code];
  return NextResponse.json(
    { success: false, notice: error.message },
    { status }
  );
}

async function sessionUser() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) return null;

  const status = await getUserStatus(sid);
  return status.isLogin === true && Number(status.uid) > 0
    ? { uid: Number(status.uid), name: status.name }
    : null;
}

function parseTopicId(value: string) {
  const topicId = Number(value);
  return Number.isSafeInteger(topicId) && topicId > 0 ? topicId : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const topicId = parseTopicId((await params).topicId);
  if (!topicId) {
    return NextResponse.json(
      { success: false, notice: "投票主题 ID 无效。" },
      { status: 400 }
    );
  }

  try {
    const user = await sessionUser();
    const poll = await getTopicVote(topicId, user?.uid);
    return NextResponse.json(
      { success: true, poll, isLogin: Boolean(user) },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const topicId = parseTopicId((await params).topicId);
  if (!topicId) {
    return NextResponse.json(
      { success: false, notice: "投票主题 ID 无效。" },
      { status: 400 }
    );
  }

  const user = await sessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, notice: "请登录后参与投票。" },
      { status: 401 }
    );
  }

  let body: { optionIds?: unknown };
  try {
    body = (await request.json()) as { optionIds?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, notice: "提交的数据格式不正确。" },
      { status: 400 }
    );
  }
  const optionIds = Array.isArray(body.optionIds)
    ? body.optionIds.map(String)
    : [];

  try {
    const poll = await castTopicVote(topicId, user.uid, optionIds);
    return NextResponse.json(
      { success: true, poll, isLogin: true },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
