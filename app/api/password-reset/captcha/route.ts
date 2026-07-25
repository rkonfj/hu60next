import { NextResponse } from "next/server";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  return forwardedProtocol
    ? forwardedProtocol === "https"
    : new URL(request.url).protocol === "https:";
}

export async function GET(request: Request) {
  try {
    const upstream = await fetch(
      `${API_BASE}/user.reset_pwd_captcha.php?r=${Date.now()}`,
      {
        headers: { "user-agent": "Hulvlin-Next/0.1" },
        cache: "no-store"
      }
    );
    if (!upstream.ok) throw new Error("captcha unavailable");

    const setCookie = upstream.headers.get("set-cookie") ?? "";
    const token =
      setCookie.match(/(?:^|,\s*)hu60_reset_pwd_captcha=([^;,\s]+)/)?.[1] ??
      "";
    if (!token) throw new Error("captcha token unavailable");

    const response = new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "private, no-store, max-age=0"
      }
    });
    response.cookies.set("hulvlin_reset_captcha", token, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: 120
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, notice: "验证码暂时无法加载。" },
      { status: 502 }
    );
  }
}
