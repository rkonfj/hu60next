import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  addWebPlug,
  listWebPlugs,
  validateWebPlugContent
} from "@/lib/webplug";

export async function GET() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  const data = await listWebPlugs(sid);
  if (data.__fallback) {
    return NextResponse.json(
      { success: false, notice: "暂时无法加载网页插件列表。" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: data.data ?? []
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  const body = (await request.json()) as {
    name?: string;
    content?: string;
    enabled?: boolean;
    loadOrder?: number;
  };
  const name = String(body.name ?? "").trim();
  const content = String(body.content ?? "");
  if (!name) {
    return NextResponse.json(
      { success: false, notice: "插件名称不能为空。" },
      { status: 400 }
    );
  }
  const contentError = validateWebPlugContent(content);
  if (contentError) {
    return NextResponse.json(
      { success: false, notice: contentError },
      { status: 400 }
    );
  }

  const result = await addWebPlug(
    {
      name,
      content,
      enabled: body.enabled,
      loadOrder: body.loadOrder
    },
    sid
  );
  if (!result.success) {
    return NextResponse.json(
      { success: false, notice: result.notice || "创建网页插件失败。" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    newId: result.newId,
    notice: result.notice || "网页插件已保存。"
  });
}
