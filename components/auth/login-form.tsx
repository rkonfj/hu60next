"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        body: form
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };

      if (!response.ok || !result.success) {
        setNotice(result.notice || "登录失败，请检查账号信息。");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setNotice("暂时无法连接登录服务，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        <span>用户名</span>
        <span className="input-shell">
          <UserRound size={18} />
          <input
            name="name"
            autoComplete="username"
            required
            maxLength={60}
            placeholder="输入虎绿林用户名"
          />
        </span>
      </label>
      <label>
        <span>密码</span>
        <span className="input-shell">
          <LockKeyhole size={18} />
          <input
            name="pass"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            placeholder="输入密码"
          />
        </span>
      </label>
      {notice && <p className="form-notice">{notice}</p>}
      <button type="submit" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="spin" size={18} /> 正在登录
          </>
        ) : (
          <>
            安全登录 <ArrowRight size={17} />
          </>
        )}
      </button>
      <p className="login-privacy">
        凭据仅通过服务端转发至 hu60.cn，不会写入浏览器存储。
      </p>
    </form>
  );
}
