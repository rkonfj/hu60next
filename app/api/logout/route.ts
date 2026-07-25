import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
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
