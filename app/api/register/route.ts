import { NextResponse } from "next/server";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

type RegistrationResponse = {
  page?: string;
  success?: boolean;
  notice?: string;
  reason?: string;
  sid?: string;
};

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  return forwardedProtocol
    ? forwardedProtocol === "https"
    : new URL(request.url).protocol === "https:";
}

async function requestRegistration(
  body: URLSearchParams,
  incomingHeaders: Headers
) {
  const { headers } = createHu60UpstreamHeaders(incomingHeaders, {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    "user-agent": "Hulvlin-Next/0.1"
  });
  const response = await fetch(`${API_BASE}/user.reg.json`, {
    method: "POST",
    headers,
    body,
    cache: "no-store"
  });
  const data = (await response.json()) as RegistrationResponse;
  return { response, data };
}

async function verifySid(sid: string, incomingHeaders: Headers) {
  const { headers } = createHu60UpstreamHeaders(incomingHeaders, {
    accept: "application/json",
    "user-agent": "Hulvlin-Next/0.1",
    "x-sid": sid
  });
  const response = await fetch(`${API_BASE}/user.stat.json?pageSize=1`, {
    headers,
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
  const pass2 = String(form.get("pass2") ?? "");
  const mail = String(form.get("mail") ?? "").trim();

  if (!name || name.length > 16) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的用户名。" },
      { status: 400 }
    );
  }
  if (!pass || pass.length > 200 || pass !== pass2) {
    return NextResponse.json(
      { success: false, notice: "两次输入的密码不一致。" },
      { status: 400 }
    );
  }
  if (!mail || mail.length > 200 || !mail.includes("@")) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的邮箱地址。" },
      { status: 400 }
    );
  }

  try {
    const check = await requestRegistration(
      new URLSearchParams({
        name,
        pass,
        mail,
        check: "1"
      }),
      request.headers
    );

    if (
      !check.response.ok ||
      check.data.success === false ||
      check.data.page !== "regStep2"
    ) {
      return NextResponse.json(
        {
          success: false,
          notice:
            check.data.notice ||
            check.data.reason ||
            "注册资料校验失败，请检查后重试。"
        },
        { status: check.response.ok ? 400 : 502 }
      );
    }

    const created = await requestRegistration(
      new URLSearchParams({
        name,
        pass,
        pass2,
        mail,
        go: "1"
      }),
      request.headers
    );
    const sid =
      typeof created.data.sid === "string" ? created.data.sid : "";

    if (
      !created.response.ok ||
      created.data.success !== true ||
      !sid ||
      !(await verifySid(sid, request.headers))
    ) {
      return NextResponse.json(
        {
          success: false,
          notice:
            created.data.notice ||
            created.data.reason ||
            "注册未完成，请稍后重试。"
        },
        { status: created.response.ok ? 400 : 502 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("hulvlin_sid", sid, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接注册服务，请稍后再试。" },
      { status: 502 }
    );
  }
}
