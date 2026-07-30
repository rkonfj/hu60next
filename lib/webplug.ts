import { cookies, headers as requestHeaders } from "next/headers";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";
import type {
  WebPlugItem,
  WebPlugListResponse,
  WebPlugMutationResponse
} from "@/lib/types";
import { validateWebPlugContent, WEBPLUG_MAX_BYTES } from "@/lib/webplug-constants";

export { WEBPLUG_MAX_BYTES, validateWebPlugContent };

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

const emptyList: WebPlugListResponse = {
  success: false,
  data: [],
  __fallback: true
};

async function resolveSid(sid?: string) {
  if (sid) return sid;
  const cookieStore = await cookies();
  return cookieStore.get("hulvlin_sid")?.value;
}

async function webplugHeaders(
  sid: string | undefined,
  extra?: HeadersInit
) {
  const incomingHeaders = await requestHeaders();
  const { headers } = createHu60UpstreamHeaders(incomingHeaders, {
    accept: "application/json",
    "user-agent": "Hulvlin-Next/0.1",
    ...(sid ? { "x-sid": sid } : {}),
    ...extra
  });
  return headers;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function listWebPlugs(sid?: string): Promise<WebPlugListResponse> {
  try {
    const session = await resolveSid(sid);
    const headers = await webplugHeaders(session);
    const response = await fetch(`${API_BASE}/api.webplug.list.json`, {
      headers,
      cache: "no-store"
    });
    if (!response.ok) return emptyList;
    const data = await parseJsonResponse<WebPlugListResponse>(response);
    if (!data.success || !Array.isArray(data.data)) return emptyList;
    return data;
  } catch {
    return emptyList;
  }
}

export async function getWebPlug(
  id: number,
  sid?: string
): Promise<WebPlugItem | null> {
  try {
    const session = await resolveSid(sid);
    if (!session) return null;

    const headers = await webplugHeaders(session, {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    });
    const response = await fetch(`${API_BASE}/api.webplug.get.json`, {
      method: "POST",
      headers,
      body: new URLSearchParams({ id: String(id) }),
      cache: "no-store"
    });
    if (!response.ok) return null;

    const data = await parseJsonResponse<{
      success?: boolean;
      data?: WebPlugItem;
    }>(response);
    if (!data.success || !data.data) return null;
    return data.data;
  } catch {
    return null;
  }
}

export async function getWebPlugHtml(sid?: string): Promise<string> {
  try {
    const session = await resolveSid(sid);
    if (!session) return "";

    const headers = await webplugHeaders(session, {
      accept: "text/html,application/json,text/plain,*/*"
    });
    const response = await fetch(`${API_BASE}/api.webplug.html.json`, {
      headers,
      cache: "no-store"
    });
    if (!response.ok) return "";

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(body) as { success?: boolean; errmsg?: string };
        if (data.success === false) return "";
      } catch {
        // 部分环境仍返回 HTML 正文。
      }
    }

    return body.trim();
  } catch {
    return "";
  }
}

export async function addWebPlug(
  input: {
    name: string;
    content: string;
    loadOrder?: number;
    enabled?: boolean;
  },
  sid?: string
): Promise<WebPlugMutationResponse> {
  const session = await resolveSid(sid);
  if (!session) {
    return { success: false, notice: "请先登录。" };
  }

  const headers = await webplugHeaders(session, {
    "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
  });
  const body = new URLSearchParams({
    name: input.name.trim(),
    content: input.content,
    enabled: input.enabled === false ? "0" : "1",
    load_order: String(Math.max(1, input.loadOrder ?? 1)),
    author_uid: "0",
    webplug_id: ""
  });

  const response = await fetch(`${API_BASE}/api.webplug.add.json`, {
    method: "POST",
    headers,
    body,
    cache: "no-store"
  });
  const data = await parseJsonResponse<WebPlugMutationResponse & {
    newId?: number;
    errmsg?: string;
  }>(response);

  if (!response.ok || !data.success) {
    return {
      success: false,
      notice: data.errmsg || data.notice || "创建网页插件失败。"
    };
  }

  return { success: true, newId: data.newId, notice: "网页插件已保存。" };
}

export async function updateWebPlug(
  id: number,
  input: { name: string; content: string },
  sid?: string
): Promise<WebPlugMutationResponse> {
  const session = await resolveSid(sid);
  if (!session) {
    return { success: false, notice: "请先登录。" };
  }

  const headers = await webplugHeaders(session, {
    "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
  });
  const body = new URLSearchParams({
    id: String(id),
    name: input.name.trim(),
    content: input.content
  });

  const response = await fetch(`${API_BASE}/api.webplug.update.json`, {
    method: "POST",
    headers,
    body,
    cache: "no-store"
  });
  const data = await parseJsonResponse<WebPlugMutationResponse & {
    updated?: number;
    errmsg?: string;
  }>(response);

  if (!response.ok || !data.success) {
    return {
      success: false,
      notice: data.errmsg || data.notice || "保存网页插件失败。"
    };
  }

  return { success: true, notice: "网页插件已保存。" };
}

export async function setWebPlugEnabled(
  id: number,
  enabled: boolean,
  sid?: string
): Promise<WebPlugMutationResponse> {
  const session = await resolveSid(sid);
  if (!session) {
    return { success: false, notice: "请先登录。" };
  }

  const headers = await webplugHeaders(session, {
    "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
  });
  const body = new URLSearchParams({
    id: String(id),
    enabled: enabled ? "1" : "0"
  });

  const response = await fetch(`${API_BASE}/api.webplug.enable.json`, {
    method: "POST",
    headers,
    body,
    cache: "no-store"
  });
  const data = await parseJsonResponse<WebPlugMutationResponse & {
    updated?: number;
    errmsg?: string;
  }>(response);

  if (!response.ok || !data.success) {
    return {
      success: false,
      notice: data.errmsg || data.notice || "更新插件状态失败。"
    };
  }

  return {
    success: true,
    notice: enabled ? "插件已启用。" : "插件已停用。"
  };
}
