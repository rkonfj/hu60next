import { NextResponse } from "next/server";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

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

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const pass = String(form.get("pass") ?? "");

  if (!name || !pass || name.length > 60 || pass.length > 200) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的用户名和密码。" },
      { status: 400 }
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
      return NextResponse.json(
        {
          success: false,
          notice:
            typeof data.notice === "string"
              ? data.notice
              : "登录失败，请检查账号信息。"
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("hulvlin_sid", sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接虎绿林登录服务。" },
      { status: 502 }
    );
  }
}
