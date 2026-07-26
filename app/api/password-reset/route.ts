import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

type ResetResponse = {
  page?: string;
  step?: number;
  success?: boolean;
  notice?: string;
};

async function resetRequest(
  body: URLSearchParams,
  incomingHeaders: Headers,
  captchaToken?: string
) {
  const { headers } = createHu60UpstreamHeaders(incomingHeaders, {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    "user-agent": "Hulvlin-Next/0.1"
  });
  if (captchaToken) {
    headers.set(
      "cookie",
      `hu60_reset_pwd_captcha=${encodeURIComponent(captchaToken)}`
    );
  }

  const response = await fetch(`${API_BASE}/user.reset_pwd.json`, {
    method: "POST",
    headers,
    body,
    cache: "no-store"
  });
  const data = (await response.json()) as ResetResponse;
  return { response, data };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const step = Number(form.get("step"));
  const phone = String(form.get("phone") ?? "").trim();

  if (!/^1\d{10}$/.test(phone)) {
    return NextResponse.json(
      { success: false, notice: "请输入有效的手机号码。" },
      { status: 400 }
    );
  }

  try {
    if (step === 2) {
      const captcha = String(form.get("captcha") ?? "").trim();
      const cookieStore = await cookies();
      const captchaToken =
        cookieStore.get("hulvlin_reset_captcha")?.value ?? "";

      if (!captcha || !captchaToken) {
        return NextResponse.json(
          { success: false, notice: "请刷新并重新输入图形验证码。" },
          { status: 400 }
        );
      }

      const result = await resetRequest(
        new URLSearchParams({
          step: "2",
          phone,
          captcha,
          go: "1"
        }),
        request.headers,
        captchaToken
      );

      if (
        !result.response.ok ||
        result.data.success !== true ||
        result.data.step !== 2
      ) {
        return NextResponse.json(
          {
            success: false,
            notice: result.data.notice || "验证码校验失败，请重新输入。"
          },
          { status: result.response.ok ? 400 : 502 }
        );
      }

      const response = NextResponse.json({
        success: true,
        step: 2,
        notice: result.data.notice || "短信验证码已发送。"
      });
      response.cookies.set("hulvlin_reset_captcha", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0
      });
      return response;
    }

    if (step === 3) {
      const seccode = String(form.get("seccode") ?? "").trim();
      const newPassword = String(form.get("newPassword") ?? "");
      const confirmPassword = String(form.get("confirmPassword") ?? "");

      if (!seccode) {
        return NextResponse.json(
          { success: false, notice: "请输入短信验证码。" },
          { status: 400 }
        );
      }
      if (
        !newPassword ||
        newPassword.length > 200 ||
        newPassword !== confirmPassword
      ) {
        return NextResponse.json(
          { success: false, notice: "两次输入的新密码不一致。" },
          { status: 400 }
        );
      }

      const result = await resetRequest(
        new URLSearchParams({
          step: "3",
          phone,
          seccode,
          new_pwd: newPassword,
          new_pwd_again: confirmPassword,
          go: "1"
        }),
        request.headers
      );

      if (
        !result.response.ok ||
        result.data.success !== true ||
        result.data.step !== 3
      ) {
        return NextResponse.json(
          {
            success: false,
            notice: result.data.notice || "密码重置失败，请检查短信验证码。"
          },
          { status: result.response.ok ? 400 : 502 }
        );
      }

      return NextResponse.json({ success: true, step: 3 });
    }

    return NextResponse.json(
      { success: false, notice: "无效的找回密码步骤。" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接密码服务，请稍后再试。" },
      { status: 502 }
    );
  }
}
