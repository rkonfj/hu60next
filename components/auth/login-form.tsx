"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  UserRound
} from "lucide-react";
import { FormEvent, useState } from "react";

export function LoginForm({
  redirectTo = "/explore/active",
  initialNotice = ""
}: {
  redirectTo?: string;
  initialNotice?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(initialNotice);

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

      window.dispatchEvent(new Event("hulvlin:session-changed"));
      window.location.replace(redirectTo);
    } catch {
      setNotice("暂时无法连接登录服务，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="login-form"
      method="post"
      action="/api/login"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="next" value={redirectTo} />
      <label>
        <span>用户名</span>
        <span className="input-shell">
          <UserRound size={18} />
          <input
            name="name"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            lang="zh-CN"
            required
            maxLength={60}
            placeholder="支持中文用户名"
          />
        </span>
      </label>
      <label>
        <span>密码</span>
        <span className="input-shell">
          <LockKeyhole size={18} />
          <input
            name="pass"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={200}
            placeholder="支持中文、表情及其它字符"
          />
        </span>
      </label>
      <label className="password-visibility">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        显示密码 / 输入中文密码
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
    </form>
  );
}
