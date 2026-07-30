import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  FLOOR_ORDER_COOKIE,
  isFloorReverseEnabled
} from "@/lib/floor-order";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

function isDocumentSubmission(request: Request) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function getPublicOrigin(request: Request) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const requestUrl = new URL(request.url);
  const host = forwardedHost || request.headers.get("host");
  const protocol =
    forwardedProtocol || requestUrl.protocol.replace(/:$/, "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
}

function applyFloorOrderCookie(response: NextResponse, floorReverse: boolean) {
  response.cookies.set(FLOOR_ORDER_COOKIE, floorReverse ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax"
  });
  return response;
}

async function persistFloorOrder(request: Request, floorReverse: boolean) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) {
    return {
      ok: false as const,
      status: 401,
      notice: "请先登录。"
    };
  }

  const { headers } = createHu60UpstreamHeaders(request.headers, {
    accept: "application/json",
    "user-agent": "Hulvlin-Next/0.1",
    "x-sid": sid
  });
  const upstream = await fetch(
    `${API_BASE}/user.index.json?${new URLSearchParams({
      floorReverse: floorReverse ? "1" : "0",
      _time: String(Math.floor(Date.now() / 1000))
    }).toString()}`,
    {
      headers,
      cache: "no-store"
    }
  );
  const data = (await upstream.json()) as {
    uid?: number;
    floorReverse?: boolean | number | string;
    error?: string | boolean;
    notice?: string;
    message?: string;
  };

  if (!upstream.ok || data.error || !data.uid) {
    return {
      ok: false as const,
      status: upstream.ok ? 400 : 502,
      notice:
        data.notice ||
        data.message ||
        (typeof data.error === "string"
          ? data.error
          : "楼层排序偏好保存失败，请稍后重试。")
    };
  }

  const savedFloorReverse = isFloorReverseEnabled(data.floorReverse);
  return {
    ok: true as const,
    savedFloorReverse,
    notice: savedFloorReverse
      ? "默认排序已设为倒序。"
      : "默认排序已设为正序。"
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const floorReverse = isFloorReverseEnabled(form.get("floorReverse"));
  const origin = getPublicOrigin(request);

  try {
    const result = await persistFloorOrder(request, floorReverse);

    if (isDocumentSubmission(request)) {
      if (!result.ok) {
        return NextResponse.redirect(
          new URL(
            `/settings?floorOrderError=${encodeURIComponent(result.notice)}`,
            origin
          ),
          303
        );
      }

      const response = NextResponse.redirect(
        new URL(
          `/settings?floorOrder=${result.savedFloorReverse ? "desc" : "asc"}`,
          origin
        ),
        303
      );
      return applyFloorOrderCookie(response, result.savedFloorReverse);
    }

    if (!result.ok) {
      return NextResponse.json(
        { success: false, notice: result.notice },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      success: true,
      notice: result.notice,
      floorReverse: result.savedFloorReverse
    });
    return applyFloorOrderCookie(response, result.savedFloorReverse);
  } catch {
    if (isDocumentSubmission(request)) {
      return NextResponse.redirect(
        new URL("/settings?floorOrderError=1", origin),
        303
      );
    }

    return NextResponse.json(
      { success: false, notice: "暂时无法连接账号服务。" },
      { status: 502 }
    );
  }
}
