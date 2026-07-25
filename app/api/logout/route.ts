import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  const response = NextResponse.redirect(
    new URL("/explore/latest", getPublicOrigin(request)),
    303
  );
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const isSecureRequest = forwardedProtocol
    ? forwardedProtocol === "https"
    : new URL(request.url).protocol === "https:";
  response.cookies.set("hulvlin_sid", "", {
    httpOnly: true,
    secure: isSecureRequest,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
