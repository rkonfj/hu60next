import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserStatus } from "@/lib/hu60";

export async function GET() {
  const cookieStore = await cookies();
  const status = await getUserStatus(cookieStore.get("hulvlin_sid")?.value);
  return NextResponse.json(status, {
    headers: { "cache-control": "private, no-store" }
  });
}
