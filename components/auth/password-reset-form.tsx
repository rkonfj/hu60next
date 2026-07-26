"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Phone,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function PasswordResetForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [captchaVersion, setCaptchaVersion] = useState(1);

  function refreshCaptcha() {
    setCaptchaVersion((value) => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/password-reset", {
        method: "POST",
        body: form
      });
      const result = (await response.json()) as {
        success?: boolean;
        step?: number;
        notice?: string;
      };
      if (!response.ok || !result.success) {
        setNotice(result.notice || "操作未完成，请检查填写内容。");
        if (step === 1) refreshCaptcha();
        return;
      }

      if (result.step === 2) {
        setNotice(result.notice || "短信验证码已发送。");
        setStep(2);
      } else if (result.step === 3) {
        setNotice("");
        setStep(3);
      }
    } catch {
      setNotice("暂时无法连接密码服务，请稍后再试。");
      if (step === 1) refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  if (step === 3) {
    return (
      <div className="auth-success">
        <span>
          <LockKeyhole size={24} />
        </span>
        <h3>密码已重置</h3>
        <p>现在可以使用新密码登录虎绿林。</p>
        <Link href="/login">
          返回登录 <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <form
      className="login-form"
      method="post"
      action="/api/password-reset"
      onSubmit={submit}
    >
      <input type="hidden" name="step" value={step === 1 ? 2 : 3} />
      {step === 2 ? (
        <input type="hidden" name="phone" value={phone} />
      ) : (
        <label>
          <span>绑定手机号</span>
          <span className="input-shell">
            <Phone size={18} />
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              pattern="1[0-9]{10}"
              maxLength={11}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="输入账号绑定的手机号"
            />
          </span>
        </label>
      )}

      {step === 1 ? (
        <>
          <label>
            <span>图形验证码</span>
            <span className="input-shell">
              <MessageSquareText size={18} />
              <input
                name="captcha"
                autoComplete="off"
                required
                maxLength={12}
                placeholder="输入图片中的字符"
              />
            </span>
          </label>
          <div className="captcha-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/password-reset/captcha?v=${captchaVersion}`}
              alt="图形验证码"
            />
            <button type="button" onClick={refreshCaptcha}>
              <RefreshCw size={15} /> 换一张
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="reset-phone-summary">
            验证码已发送到 <strong>{phone}</strong>
            <button
              type="button"
              onClick={() => {
                setNotice("");
                setStep(1);
                refreshCaptcha();
              }}
            >
              重新发送
            </button>
          </div>
          <label>
            <span>短信验证码</span>
            <span className="input-shell">
              <MessageSquareText size={18} />
              <input
                name="seccode"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={12}
                placeholder="输入短信验证码"
              />
            </span>
          </label>
          <label>
            <span>新密码</span>
            <span className="input-shell">
              <LockKeyhole size={18} />
              <input
                name="newPassword"
                type="text"
                inputMode="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                lang="zh-CN"
                className={`chinese-password-input${showPassword ? "" : " masked"}`}
                required
                maxLength={200}
                placeholder="输入新密码"
              />
            </span>
          </label>
          <label>
            <span>确认新密码</span>
            <span className="input-shell">
              <LockKeyhole size={18} />
              <input
                name="confirmPassword"
                type="text"
                inputMode="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                lang="zh-CN"
                className={`chinese-password-input${showPassword ? "" : " masked"}`}
                required
                maxLength={200}
                placeholder="再输入一次新密码"
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
        </>
      )}

      {notice && (
        <p className={step === 2 ? "form-notice success" : "form-notice"}>
          {notice}
        </p>
      )}
      <button type="submit" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="spin" size={18} /> 正在处理
          </>
        ) : step === 1 ? (
          <>
            发送短信验证码 <ArrowRight size={17} />
          </>
        ) : (
          <>
            设置新密码 <ArrowRight size={17} />
          </>
        )}
      </button>
      <div className="auth-inline-link">
        收不到验证码？联系
        <Link href="/user/1">@老虎会游泳</Link>
      </div>
      <div className="auth-inline-link">
        想起密码了？<Link href="/login">返回登录</Link>
      </div>
    </form>
  );
}
