import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getWebPlug,
  setWebPlugEnabled,
  updateWebPlug,
  validateWebPlugContent
} from "@/lib/webplug";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const pluginId = Number(id);
  if (!Number.isSafeInteger(pluginId) || pluginId <= 0) {
    return NextResponse.json(
      { success: false, notice: "无效的插件 ID。" },
      { status: 400 }
    );
  }

  const plugin = await getWebPlug(pluginId, sid);
  if (!plugin) {
    return NextResponse.json(
      { success: false, notice: "网页插件不存在或无法读取。" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: plugin });
}

export async function PUT(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const pluginId = Number(id);
  if (!Number.isSafeInteger(pluginId) || pluginId <= 0) {
    return NextResponse.json(
      { success: false, notice: "无效的插件 ID。" },
      { status: 400 }
    );
  }

  const body = (await request.json()) as {
    name?: string;
    content?: string;
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

  const result = await updateWebPlug(pluginId, { name, content }, sid);
  if (!result.success) {
    return NextResponse.json(
      { success: false, notice: result.notice || "保存网页插件失败。" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    notice: result.notice || "网页插件已保存。"
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录。" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const pluginId = Number(id);
  if (!Number.isSafeInteger(pluginId) || pluginId <= 0) {
    return NextResponse.json(
      { success: false, notice: "无效的插件 ID。" },
      { status: 400 }
    );
  }

  const body = (await request.json()) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { success: false, notice: "请指定启用或停用状态。" },
      { status: 400 }
    );
  }

  const result = await setWebPlugEnabled(pluginId, body.enabled, sid);
  if (!result.success) {
    return NextResponse.json(
      { success: false, notice: result.notice || "更新插件状态失败。" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    notice: result.notice || (body.enabled ? "插件已启用。" : "插件已停用。")
  });
}
