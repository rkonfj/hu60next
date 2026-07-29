"use client";

import {
  Eye,
  EyeOff,
  ImageUp,
  LoaderCircle,
  LockKeyhole,
  PencilLine,
  Save
} from "lucide-react";
import { FormEvent, useState } from "react";

type Notice = { kind: "success" | "error"; text: string } | null;

function avatarSource(value?: string | null) {
  if (!value || value === "/upload/default.jpg") return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://hu60.cn${value}`;
  return value.replace("http://", "https://");
}

async function submitForm(path: string, form: FormData) {
  const response = await fetch(path, { method: "POST", body: form });
  const result = (await response.json()) as {
    success?: boolean;
    notice?: string;
  };
  return {
    ok: response.ok && result.success === true,
    notice: result.notice || "操作未完成。"
  };
}

export function AccountSettings({
  name,
  avatar,
  signature,
  contact
}: {
  name: string;
  avatar?: string | null;
  signature?: string | null;
  contact?: string | null;
}) {
  const currentAvatar = avatarSource(avatar);
  const [nameBusy, setNameBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nameNotice, setNameNotice] = useState<Notice>(null);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [avatarNotice, setAvatarNotice] = useState<Notice>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  async function changeName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameBusy(true);
    setNameNotice(null);
    const form = new FormData(event.currentTarget);
    if (String(form.get("newName") ?? "").trim() === name) {
      setNameNotice({ kind: "error", text: "新用户名与当前用户名相同。" });
      setNameBusy(false);
      return;
    }
    try {
      const result = await submitForm("/api/account/name", form);
      setNameNotice({
        kind: result.ok ? "success" : "error",
        text: result.notice
      });
      if (result.ok) {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      setNameNotice({ kind: "error", text: "用户名服务暂时不可用。" });
    } finally {
      setNameBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileNotice(null);
    try {
      const result = await submitForm(
        "/api/account/profile",
        new FormData(event.currentTarget)
      );
      setProfileNotice({
        kind: result.ok ? "success" : "error",
        text: result.notice
      });
    } catch {
      setProfileNotice({ kind: "error", text: "资料服务暂时不可用。" });
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordNotice(null);
    const target = event.currentTarget;
    const form = new FormData(target);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setPasswordNotice({ kind: "error", text: "两次新密码不一致。" });
      setPasswordBusy(false);
      return;
    }
    try {
      const result = await submitForm("/api/account/password", form);
      setPasswordNotice({
        kind: result.ok ? "success" : "error",
        text: result.notice
      });
      if (result.ok) {
        target.reset();
        setTimeout(() => window.location.replace("/login"), 900);
      }
    } catch {
      setPasswordNotice({ kind: "error", text: "密码服务暂时不可用。" });
    } finally {
      setPasswordBusy(false);
    }
  }

  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvatarBusy(true);
    setAvatarNotice(null);
    try {
      const result = await submitForm(
        "/api/account/avatar",
        new FormData(event.currentTarget)
      );
      setAvatarNotice({
        kind: result.ok ? "success" : "error",
        text: result.notice
      });
      if (result.ok) {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      setAvatarNotice({ kind: "error", text: "头像服务暂时不可用。" });
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="settings-sections">
      <section className="settings-card">
        <header>
          <PencilLine size={18} />
          <div>
            <h2>修改用户名</h2>
            <p>最多 16 个英文字母或 8 个汉字，不可与其他用户重复。</p>
          </div>
        </header>
        <form onSubmit={changeName} className="settings-form">
          <label>
            <span>新用户名</span>
            <input
              name="newName"
              type="text"
              defaultValue={name}
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={16}
              pattern="[\p{Script=Han}A-Za-z0-9_\-]+"
              title="只允许汉字、英文字母、数字、下划线和减号"
            />
          </label>
          {nameNotice ? (
            <p className={`settings-notice ${nameNotice.kind}`}>
              {nameNotice.text}
            </p>
          ) : null}
          <button type="submit" disabled={nameBusy}>
            {nameBusy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <PencilLine size={16} />
            )}
            修改用户名
          </button>
        </form>
      </section>

      <section className="settings-card">
        <header>
          <ImageUp size={18} />
          <div>
            <h2>头像</h2>
            <p>上传 512KB 以内的 JPEG 图片。</p>
          </div>
        </header>
        <form onSubmit={uploadAvatar} className="avatar-settings-form">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="新头像预览" />
          ) : (
            <span className="avatar avatar-xl" aria-hidden="true">
              {currentAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatar}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span>{(name.trim() || "虎").slice(0, 1).toUpperCase()}</span>
              )}
            </span>
          )}
          <label>
            选择图片
            <input
              type="file"
              name="avatar"
              accept="image/jpeg"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setAvatarPreview(URL.createObjectURL(file));
              }}
            />
          </label>
          <button type="submit" disabled={avatarBusy}>
            {avatarBusy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ImageUp size={16} />
            )}
            上传头像
          </button>
        </form>
        {avatarNotice ? (
          <p className={`settings-notice ${avatarNotice.kind}`}>
            {avatarNotice.text}
          </p>
        ) : null}
      </section>

      <section className="settings-card">
        <header>
          <Save size={18} />
          <div>
            <h2>个人资料</h2>
            <p>这些内容会显示在用户主页。</p>
          </div>
        </header>
        <form onSubmit={saveProfile} className="settings-form">
          <label>
            <span>个性签名</span>
            <textarea
              name="signature"
              defaultValue={signature ?? ""}
              maxLength={1000}
              rows={4}
            />
          </label>
          <label>
            <span>联系方式</span>
            <textarea
              name="contact"
              defaultValue={contact ?? ""}
              maxLength={1000}
              rows={3}
            />
          </label>
          {profileNotice ? (
            <p className={`settings-notice ${profileNotice.kind}`}>
              {profileNotice.text}
            </p>
          ) : null}
          <button type="submit" disabled={profileBusy}>
            {profileBusy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            保存资料
          </button>
        </form>
      </section>

      <section className="settings-card">
        <header>
          <LockKeyhole size={18} />
          <div>
            <h2>修改密码</h2>
            <p>修改成功后需要使用新密码重新登录。</p>
          </div>
        </header>
        <form onSubmit={changePassword} className="settings-form">
          <label>
            <span>原密码</span>
            <input
              name="oldPassword"
              type="text"
              inputMode="text"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              lang="zh-CN"
              className={`chinese-password-input${showPassword ? "" : " masked"}`}
              required
              maxLength={200}
            />
          </label>
          <label>
            <span>新密码</span>
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
            />
          </label>
          <label>
            <span>确认新密码</span>
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
            />
          </label>
          <label className="password-visibility">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>显示密码 / 输入中文密码</span>
          </label>
          {passwordNotice ? (
            <p className={`settings-notice ${passwordNotice.kind}`}>
              {passwordNotice.text}
            </p>
          ) : null}
          <button type="submit" disabled={passwordBusy}>
            {passwordBusy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <LockKeyhole size={16} />
            )}
            修改密码
          </button>
        </form>
      </section>
    </div>
  );
}
