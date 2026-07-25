import { NextResponse } from "next/server";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

function getSafeRedirectPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/explore/latest";
}

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

function loginFailure(
  request: Request,
  redirectTo: string,
  notice: string,
  status: number,
  error: "invalid" | "service" = "invalid"
) {
  if (isDocumentSubmission(request)) {
    const url = new URL("/login", getPublicOrigin(request));
    url.searchParams.set("error", error);
    if (redirectTo !== "/explore/latest") {
      url.searchParams.set("next", redirectTo);
    }
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.json({ success: false, notice }, { status });
}

function findSid(
  data: Record<string, unknown>,
  setCookie: string | null,
  sidHeader: string | null
) {
  if (typeof data.sid === "string") return data.sid;
  if (
    data.cookie &&
    typeof data.cookie === "object" &&
    typeof (data.cookie as Record<string, unknown>).sid === "string"
  ) {
    return (data.cookie as Record<string, string>).sid;
  }
  if (sidHeader) return sidHeader;
  return setCookie?.match(/(?:^|,\s*)hu60_sid=([^;,\s]+)/)?.[1] ?? null;
}

async function verifySid(sid: string) {
  const response = await fetch(`${API_BASE}/user.stat.json?pageSize=1`, {
    headers: {
      accept: "application/json",
      "user-agent": "Hulvlin-Next/0.1",
      "x-sid": sid
    },
    cache: "no-store"
  });

  if (!response.ok) return false;
  const status = (await response.json()) as {
    uid?: number | string | null;
    isLogin?: boolean | null;
  };
  return Boolean(status.uid) || status.isLogin === true;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const pass = String(form.get("pass") ?? "");
  const redirectTo = getSafeRedirectPath(form.get("next"));

  if (!name || !pass || name.length > 60 || pass.length > 200) {
    return loginFailure(
      request,
      redirectTo,
      "请输入有效的用户名和密码。",
      400
    );
  }

  try {
    const body = new URLSearchParams({
      type: "1",
      name,
      pass,
      go: "1"
    });
    const upstream = await fetch(`${API_BASE}/user.login.json`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "Hulvlin-Next/0.1"
      },
      body,
      cache: "no-store"
    });
    const data = (await upstream.json()) as Record<string, unknown>;
    const sid = findSid(
      data,
      upstream.headers.get("set-cookie"),
      upstream.headers.get("x-sid")
    );

    if (!upstream.ok || data.success === false || !sid) {
      return loginFailure(
        request,
        redirectTo,
        typeof data.notice === "string"
          ? data.notice
          : "登录失败，请检查账号信息。",
        401
      );
    }

    if (!(await verifySid(sid))) {
      return loginFailure(
        request,
        redirectTo,
        "登录会话验证失败，请重新登录。",
        401
      );
    }

    const response = isDocumentSubmission(request)
      ? NextResponse.redirect(
          new URL(redirectTo, getPublicOrigin(request)),
          303
        )
      : NextResponse.json({ success: true });
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim();
    const isSecureRequest = forwardedProtocol
      ? forwardedProtocol === "https"
      : new URL(request.url).protocol === "https:";
    response.cookies.set("hulvlin_sid", sid, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch {
    return loginFailure(
      request,
      redirectTo,
      "暂时无法连接虎绿林登录服务。",
      502,
      "service"
    );
  }
}
