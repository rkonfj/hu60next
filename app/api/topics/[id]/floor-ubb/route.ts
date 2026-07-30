import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTopic } from "@/lib/hu60";
import { floorReverseFlag } from "@/lib/floor-order";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const topicId = Number(id);
  const url = new URL(request.url);
  const contentId = Number(url.searchParams.get("contentId"));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const floorReverse = url.searchParams.get("reverse") === "1";

  if (!Number.isInteger(topicId) || topicId < 1) {
    return NextResponse.json({ success: false, notice: "帖子地址无效。" }, { status: 400 });
  }
  if (!Number.isInteger(contentId) || contentId < 1) {
    return NextResponse.json({ success: false, notice: "楼层无效。" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  try {
    const topic = await getTopic(topicId, page, sid, {
      floorReverse: floorReverseFlag(floorReverse),
      contentFormat: "ubb"
    });
    const floor = topic.tContents.find((item) => Number(item.id) === contentId);

    if (!floor || typeof floor.content !== "string") {
      return NextResponse.json(
        { success: false, notice: "找不到该楼层的原文。" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, content: floor.content });
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法读取楼层原文。" },
      { status: 502 }
    );
  }
}
