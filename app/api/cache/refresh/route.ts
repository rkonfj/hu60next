import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getCacheDashboardData,
  refreshCache
} from "@/lib/cache-admin";
import { getUserStatus } from "@/lib/hu60";
import { hasModeratorPermission } from "@/lib/moderator";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { error: "需要登录" },
      { status: 401 }
    );
  }

  const session = await getUserStatus(sid);
  if (
    session.isLogin !== true ||
    !hasModeratorPermission(session.permissions)
  ) {
    return NextResponse.json(
      { error: "页面不存在" },
      { status: 404 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    key?: unknown;
    uid?: unknown;
  } | null;
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key) {
    return NextResponse.json(
      { error: "缺少缓存标识" },
      { status: 400 }
    );
  }

  try {
    const targetUid =
      body?.uid === undefined ? undefined : Number(body.uid);
    if (
      key === "personal-weekly-report" &&
      (!Number.isInteger(targetUid) || Number(targetUid) <= 0)
    ) {
      return NextResponse.json(
        { error: "请输入有效的UID" },
        { status: 400 }
      );
    }
    const refresh = await refreshCache(
      key,
      Number(session.uid),
      targetUid
    );
    return NextResponse.json(
      {
        refresh,
        dashboard: getCacheDashboardData()
      },
      {
        headers: { "cache-control": "private, no-store" }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "刷新失败",
        dashboard: getCacheDashboardData()
      },
      {
        status: 400,
        headers: { "cache-control": "private, no-store" }
      }
    );
  }
}
