import { ExternalLink, Leaf, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
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
      : "/explore/latest";
  const cleanLoginUrl =
    redirectTo === "/explore/latest"
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
            <p>
              登录后可查看消息状态；发帖与回复将在账号联调完成后逐步开放。
            </p>
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
            <ShieldCheck size={15} /> 服务端安全会话
          </span>
          <h2>登录虎绿林</h2>
          <p>使用你在原社区已有的账号，无需重新注册。</p>
          <LoginForm
            redirectTo={redirectTo}
            initialNotice={initialNotice}
          />
          <div className="auth-links">
            <a
              href="https://hu60.cn/q.php/user.reset_pwd.html"
              target="_blank"
              rel="noreferrer"
            >
              忘记密码 <ExternalLink size={13} />
            </a>
            <a
              href="https://hu60.cn/q.php/user.reg.html"
              target="_blank"
              rel="noreferrer"
            >
              注册账号 <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
