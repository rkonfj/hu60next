import { NextResponse } from "next/server";
import { getForum } from "@/lib/hu60";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const forumId = Number(id);

  if (!Number.isInteger(forumId) || forumId < 0) {
    return NextResponse.json({ error: "Invalid forum id" }, { status: 400 });
  }

  const forum = await getForum(forumId);
  const current = forum.fIndex.at(-1);

  return NextResponse.json(
    {
      id: current?.id ?? forumId,
      name: current?.name ?? forum.fName,
      postable: current?.notopic !== 1,
      children: forum.childForum.map((child) => ({
        id: child.id,
        name: child.name
      }))
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
