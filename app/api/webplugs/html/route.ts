import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWebPlugHtml } from "@/lib/webplug";

export async function GET() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return new NextResponse("", { status: 204 });
  }

  const html = await getWebPlugHtml(sid);
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
