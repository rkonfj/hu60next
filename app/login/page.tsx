import { Leaf } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "登录" };

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    name?: string;
    pass?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const redirectTo =
    query.next?.startsWith("/") && !query.next.startsWith("//")
      ? query.next
      : "/explore/active";
  const cleanLoginUrl =
    redirectTo === "/explore/active"
      ? "/login"
      : `/login?next=${encodeURIComponent(redirectTo)}`;

  if (query.name !== undefined || query.pass !== undefined) {
    redirect(cleanLoginUrl);
  }

  const initialNotice =
    query.error === "service"
      ? "暂时无法连接登录服务，请稍后再试。"
      : query.error === "invalid"
        ? "登录失败，请检查账号信息。"
        : "";

  return (
    <main className="auth-page">
      <section className="auth-promo">
        <div className="auth-promo-content">
          <Brand />
          <div>
            <span className="eyebrow">
              <Leaf size={14} />
              欢迎回来
            </span>
            <h1>回到熟悉的社区，继续上次的讨论。</h1>
            <p>登录后可查看消息、参与讨论并管理你的社区状态。</p>
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
        <div className="auth-form-wrap login-auth-form-wrap">
          <div className="mobile-auth-brand">
            <Brand />
          </div>
          <h2>登录虎绿林</h2>
          <LoginForm
            redirectTo={redirectTo}
            initialNotice={initialNotice}
          />
          <div className="auth-links">
            <Link href="/forgot-password">忘记密码</Link>
            <Link href="/register">注册账号</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
