import { Leaf, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "注册账号" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-promo">
        <div className="auth-promo-content">
          <Brand />
          <div>
            <span className="eyebrow">
              <Leaf size={14} />
              加入虎绿林
            </span>
            <h1>留个名字，一起把讨论继续下去。</h1>
            <p>注册完成后会自动登录，可以立即发帖、回复和收发消息。</p>
          </div>
          <blockquote>
            “好的社区不是信息经过的地方，而是经验留下来的地方。”
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
          <span className="secure-label">
            <ShieldCheck size={15} /> 服务端安全注册
          </span>
          <h2>注册虎绿林</h2>
          <p>用户名最长 16 个字符，密码支持中文和表情。</p>
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
