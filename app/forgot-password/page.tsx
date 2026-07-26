import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "忘记密码" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-promo">
        <div className="auth-promo-content">
          <Brand />
          <div>
            <span className="eyebrow">
              <KeyRound size={14} />
              找回账号
            </span>
            <h1>验证绑定手机，重新设置密码。</h1>
            <p>图形验证码和短信验证码都由 hu60.cn 原有服务处理。</p>
          </div>
          <blockquote>
            密码可以使用中文、表情和其它方便记忆的字符。
          </blockquote>
        </div>
        <div className="auth-pattern" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-auth-brand">
            <Brand />
          </div>
          <h2>忘记密码</h2>
          <p>使用账号已绑定的手机号码找回。</p>
          <PasswordResetForm />
        </div>
      </section>
    </main>
  );
}
