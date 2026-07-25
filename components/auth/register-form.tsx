"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    const form = new FormData(event.currentTarget);
    if (form.get("pass") !== form.get("pass2")) {
      setNotice("两次输入的密码不一致。");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        body: form
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };
      if (!response.ok || !result.success) {
        setNotice(result.notice || "注册未完成，请检查填写内容。");
        return;
      }

      window.dispatchEvent(new Event("hulvlin:session-changed"));
      window.location.replace("/explore/active");
    } catch {
      setNotice("暂时无法连接注册服务，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="login-form"
      method="post"
      action="/api/register"
      onSubmit={handleSubmit}
    >
      <label>
        <span>用户名</span>
        <span className="input-shell">
          <UserRound size={18} />
          <input
            name="name"
            autoComplete="username"
            required
            maxLength={16}
            placeholder="汉字、字母、数字、_ 或 -"
          />
        </span>
      </label>
      <label>
        <span>邮箱</span>
        <span className="input-shell">
          <Mail size={18} />
          <input
            name="mail"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            placeholder="用于账号联系"
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
            autoComplete="new-password"
            required
            maxLength={200}
            placeholder="支持中文、表情及其它字符"
          />
        </span>
      </label>
      <label>
        <span>确认密码</span>
        <span className="input-shell">
          <LockKeyhole size={18} />
          <input
            name="pass2"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            maxLength={200}
            placeholder="再输入一次密码"
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
            <LoaderCircle className="spin" size={18} /> 正在注册
          </>
        ) : (
          <>
            创建账号 <ArrowRight size={17} />
          </>
        )}
      </button>
      <p className="login-privacy">
        注册资料仅通过服务端提交至 hu60.cn。
      </p>
      <div className="auth-inline-link">
        已有账号？<Link href="/login">返回登录</Link>
      </div>
    </form>
  );
}
