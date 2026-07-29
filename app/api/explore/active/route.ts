import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getActiveTopics } from "@/lib/hu60";

export async function GET(request: Request) {
  const requestedPage = Number(new URL(request.url).searchParams.get("page"));
  const page = Math.max(1, Math.trunc(requestedPage) || 1);
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const feed = await getActiveTopics(page, sid);

  return NextResponse.json(feed, {
    headers: {
      "cache-control": "private, no-store"
    }
  });
}
