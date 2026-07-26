"use client";

import {
  Eye,
  EyeOff,
  ImageUp,
  LoaderCircle,
  LockKeyhole,
  Palette,
  Save
} from "lucide-react";
import { CSSProperties, FormEvent, useState } from "react";

type Notice = { kind: "success" | "error"; text: string } | null;

const DEFAULT_TAIL_COLOR = "#ffffff";
const DEFAULT_TAIL_BACKGROUND = "#33cc99";
const TAIL_STYLE_RULES: Record<string, RegExp> = {
  color: /^(?:#[\da-f]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\))$/i,
  background:
    /^(?:#[\da-f]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\))$/i,
  "background-color":
    /^(?:#[\da-f]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\))$/i,
  "font-size": /^(?:[8-9]|1[0-8])px$/,
  "font-weight": /^(?:normal|bold|[4-7]00)$/,
  "font-style": /^(?:normal|italic)$/,
  display: /^(?:inline|inline-block|block)$/,
  padding:
    /^(?:0|(?:[0-9]|1[0-2])px)(?:\s+(?:0|(?:[0-9]|1[0-2])px)){0,3}$/,
  margin:
    /^(?:0|(?:[0-9]|1[0-2])px)(?:\s+(?:0|(?:[0-9]|1[0-2])px)){0,3}$/,
  "margin-top": /^(?:0|(?:[0-9]|1[0-2])px)$/,
  "margin-right": /^(?:0|(?:[0-9]|1[0-2])px)$/,
  "margin-bottom": /^(?:0|(?:[0-9]|1[0-2])px)$/,
  "margin-left": /^(?:0|(?:[0-9]|1[0-2])px)$/,
  "border-radius": /^(?:0|[0-6](?:\.\d+)?px)$/,
  "text-align": /^(?:left|right|center)$/
};

const STYLE_PROPERTY_NAMES: Record<string, keyof CSSProperties> = {
  color: "color",
  background: "background",
  "background-color": "backgroundColor",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "font-style": "fontStyle",
  display: "display",
  padding: "padding",
  margin: "margin",
  "margin-top": "marginTop",
  "margin-right": "marginRight",
  "margin-bottom": "marginBottom",
  "margin-left": "marginLeft",
  "border-radius": "borderRadius",
  "text-align": "textAlign"
};

function sanitizeTailCss(value: string) {
  return value
    .split(";")
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator < 1) return null;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const propertyValue = declaration.slice(separator + 1).trim();
      return TAIL_STYLE_RULES[property]?.test(propertyValue)
        ? `${property}:${propertyValue}`
        : null;
    })
    .filter(Boolean)
    .join(";");
}

function cssToReactStyle(value: string) {
  const style: CSSProperties = {};
  for (const declaration of sanitizeTailCss(value).split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator);
    const propertyName = STYLE_PROPERTY_NAMES[property];
    if (!propertyName) continue;
    Object.assign(style, {
      [propertyName]: declaration.slice(separator + 1)
    });
  }
  return style;
}

function readStyleValue(style: string, property: string) {
  const match = style.match(
    new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i")
  );
  return match?.[1]?.trim();
}

function parseTail(value?: string | null) {
  const raw = value?.trim() ?? "";
  const match = raw.match(/^\[span=([^\]]+)\]([\s\S]*)\[\/span\]$/i);
  const style = match?.[1] ?? "";
  const color = readStyleValue(style, "color");
  const background =
    readStyleValue(style, "background-color") ??
    readStyleValue(style, "background");
  const fontSize = readStyleValue(style, "font-size")?.match(/\d+/)?.[0];

  return {
    text: match?.[2] ?? raw,
    customCss: sanitizeTailCss(style)
      .split(";")
      .filter(
        (declaration) =>
          !/^(?:color|background|background-color|font-size|display|padding|border-radius):/.test(
            declaration
          )
      )
      .join(";"),
    color: /^#[\da-f]{6}$/i.test(color ?? "")
      ? color!
      : DEFAULT_TAIL_COLOR,
    background: /^#[\da-f]{6}$/i.test(background ?? "")
      ? background!
      : DEFAULT_TAIL_BACKGROUND,
    fontSize: ["10", "11", "12", "13", "14"].includes(fontSize ?? "")
      ? fontSize!
      : "10"
  };
}

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
  const initialTail = parseTail(signature);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [avatarNotice, setAvatarNotice] = useState<Notice>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [signatureValue, setSignatureValue] = useState(signature ?? "");
  const [tailText, setTailText] = useState(initialTail.text);
  const [tailColor, setTailColor] = useState(initialTail.color);
  const [tailBackground, setTailBackground] = useState(
    initialTail.background
  );
  const [tailFontSize, setTailFontSize] = useState(initialTail.fontSize);
  const [tailCustomCss, setTailCustomCss] = useState(initialTail.customCss);
  const [tailNotice, setTailNotice] = useState("");

  function writeTailToSignature() {
    const text = tailText.trim().replaceAll("[", "［").replaceAll("]", "］");
    if (!text) {
      setTailNotice("先填写小尾巴文字。");
      return;
    }
    const safeCustomCss = sanitizeTailCss(tailCustomCss);
    const style = [
      `color:${tailColor}`,
      `font-size:${tailFontSize}px`,
      `background:${tailBackground}`,
      "display:inline-block",
      "padding:2px 5px",
      "border-radius:3px",
      safeCustomCss
    ]
      .filter(Boolean)
      .join(";");
    setSignatureValue(`[span=${style}]${text}[/span]`);
    setTailNotice(
      tailCustomCss.trim() && safeCustomCss !== tailCustomCss.trim()
        ? "已写入签名；不安全或不支持的 CSS 已移除，保存资料后生效。"
        : "已写入下方签名，保存资料后生效。"
    );
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
                  referrerPolicy="no-referrer"
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
          <div className="tail-editor">
            <div className="tail-editor-title">
              <Palette size={16} />
              <div>
                <strong>小尾巴</strong>
                <small>小尾巴由 HU60 的个性签名生成。</small>
              </div>
            </div>
            <label className="tail-editor-text">
              <span>文字</span>
              <input
                type="text"
                value={tailText}
                maxLength={120}
                placeholder="写一句显示在帖子下方的话"
                onChange={(event) => {
                  setTailText(event.target.value);
                  setTailNotice("");
                }}
              />
            </label>
            <label className="tail-editor-text">
              <span>自定义 CSS（可选）</span>
              <input
                type="text"
                value={tailCustomCss}
                maxLength={500}
                spellCheck={false}
                placeholder="例如 font-weight:bold;margin-top:4px"
                onChange={(event) => {
                  setTailCustomCss(event.target.value);
                  setTailNotice("");
                }}
              />
              <small>
                支持颜色、8–18px 字号、字重、斜体、间距、圆角和对齐；会过滤浮动与定位。
              </small>
            </label>
            <div className="tail-editor-options">
              <label>
                <span>文字</span>
                <input
                  type="color"
                  value={tailColor}
                  aria-label="小尾巴文字颜色"
                  onChange={(event) => setTailColor(event.target.value)}
                />
              </label>
              <label>
                <span>背景</span>
                <input
                  type="color"
                  value={tailBackground}
                  aria-label="小尾巴背景颜色"
                  onChange={(event) => setTailBackground(event.target.value)}
                />
              </label>
              <label>
                <span>字号</span>
                <select
                  value={tailFontSize}
                  aria-label="小尾巴字号"
                  onChange={(event) => setTailFontSize(event.target.value)}
                >
                  {[10, 11, 12, 13, 14].map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </label>
              <span
                className="tail-editor-preview"
                style={{
                  color: tailColor,
                  backgroundColor: tailBackground,
                  fontSize: `${tailFontSize}px`,
                  ...cssToReactStyle(tailCustomCss)
                }}
              >
                {tailText.trim() || "小尾巴预览"}
              </span>
              <button type="button" onClick={writeTailToSignature}>
                写入签名
              </button>
            </div>
            {tailNotice ? <small className="tail-editor-notice">{tailNotice}</small> : null}
          </div>
          <label>
            <span>个性签名 / 小尾巴原文</span>
            <textarea
              name="signature"
              value={signatureValue}
              onChange={(event) => {
                setSignatureValue(event.target.value);
                setTailNotice("");
              }}
              maxLength={1000}
              rows={4}
            />
            <small className="settings-field-help">
              支持 HU60 UBB。直接编辑这里也可以，保存后会用于帖子小尾巴。
            </small>
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
