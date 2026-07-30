"use client";

import { LoaderCircle, Plus, Puzzle, Save } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { WebPlugSummary } from "@/lib/types";
import { WEBPLUG_MAX_BYTES } from "@/lib/webplug-constants";

type Notice = { kind: "success" | "error"; text: string } | null;

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function isEnabled(value: WebPlugSummary["enabled"]) {
  return value === true || value === 1;
}

export function WebPlugManager({
  initialPlugins
}: {
  initialPlugins: WebPlugSummary[];
}) {
  const [plugins, setPlugins] = useState(initialPlugins);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(
    initialPlugins[0]?.id ?? null
  );
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  const contentBytes = useMemo(
    () => new TextEncoder().encode(content).length,
    [content]
  );

  const loadPlugin = useCallback(async (id: number) => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/webplugs/${id}`, {
        cache: "no-store"
      });
      const result = (await response.json()) as {
        success?: boolean;
        data?: { name: string; content: string; enabled?: boolean | number };
        notice?: string;
      };
      if (!response.ok || !result.success || !result.data) {
        setNotice({
          kind: "error",
          text: result.notice || "读取插件失败。"
        });
        return;
      }
      setName(result.data.name);
      setContent(result.data.content);
      setEnabled(isEnabled(result.data.enabled ?? true));
    } catch {
      setNotice({ kind: "error", text: "读取插件失败。" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === "new") {
      setName("");
      setContent("");
      setEnabled(true);
      setNotice(null);
      return;
    }
    if (typeof selectedId === "number") {
      void loadPlugin(selectedId);
    }
  }, [selectedId, loadPlugin]);

  async function refreshList(selectId?: number) {
    const response = await fetch("/api/webplugs", { cache: "no-store" });
    const result = (await response.json()) as {
      success?: boolean;
      data?: WebPlugSummary[];
    };
    if (result.success && Array.isArray(result.data)) {
      setPlugins(result.data);
      if (selectId) setSelectedId(selectId);
    }
  }

  async function savePlugin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    const payload = { name: name.trim(), content };
    try {
      const response =
        selectedId === "new"
          ? await fetch("/api/webplugs", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            })
          : await fetch(`/api/webplugs/${selectedId}`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
        newId?: number;
      };
      if (!response.ok || !result.success) {
        setNotice({
          kind: "error",
          text: result.notice || "保存失败。"
        });
        return;
      }

      setNotice({
        kind: "success",
        text: result.notice || "网页插件已保存。"
      });
      window.dispatchEvent(new Event("hu60-webplug-reload"));
      const nextId =
        selectedId === "new" ? Number(result.newId) : Number(selectedId);
      await refreshList(
        Number.isSafeInteger(nextId) && nextId > 0 ? nextId : undefined
      );
    } catch {
      setNotice({ kind: "error", text: "保存失败，请稍后重试。" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    if (typeof selectedId !== "number") return;

    const nextEnabled = !enabled;
    setTogglingEnabled(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/webplugs/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };
      if (!response.ok || !result.success) {
        setNotice({
          kind: "error",
          text: result.notice || "更新状态失败。"
        });
        return;
      }

      setEnabled(nextEnabled);
      setNotice({
        kind: "success",
        text: result.notice || (nextEnabled ? "插件已启用。" : "插件已停用。")
      });
      window.dispatchEvent(new Event("hu60-webplug-reload"));
      await refreshList(selectedId);
    } catch {
      setNotice({ kind: "error", text: "更新状态失败，请稍后重试。" });
    } finally {
      setTogglingEnabled(false);
    }
  }

  return (
    <div className="webplug-manager">
      <aside className="webplug-list-panel">
        <div className="webplug-list-header">
          <h2>我的插件</h2>
          <button
            type="button"
            className="webplug-new-button"
            onClick={() => setSelectedId("new")}
          >
            <Plus size={15} />
            新建
          </button>
        </div>
        {plugins.length ? (
          <ul className="webplug-list">
            {plugins.map((plugin) => (
              <li key={plugin.id}>
                <button
                  type="button"
                  className={
                    selectedId === plugin.id ? "webplug-item active" : "webplug-item"
                  }
                  onClick={() => setSelectedId(plugin.id)}
                >
                  <span className="webplug-item-name">{plugin.name}</span>
                  <span className="webplug-item-meta">
                    {formatBytes(plugin.size)}
                    {isEnabled(plugin.enabled) ? " · 已启用" : " · 已停用"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="webplug-empty">还没有网页插件，点击「新建」开始编写。</p>
        )}
      </aside>

      <section className="settings-card webplug-editor-panel">
        <header>
          <Puzzle size={18} />
          <div>
            <h2>{selectedId === "new" ? "新建网页插件" : "编辑网页插件"}</h2>
            <p>
              可写入 HTML、CSS、JavaScript，保存后会在所有页面底部注入运行，与虎绿林原版行为一致。
            </p>
          </div>
        </header>

        {selectedId ? (
          <form onSubmit={savePlugin} className="settings-form webplug-editor-form">
            {typeof selectedId === "number" ? (
              <div className="webplug-enable-row">
                <label className="webplug-enable-toggle">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => void toggleEnabled()}
                    disabled={loading || saving || togglingEnabled}
                  />
                  <span>启用此插件</span>
                </label>
                <span className="webplug-enable-hint">
                  {enabled ? "停用后不会在页面中加载运行。" : "当前已停用，启用后才会注入页面。"}
                </span>
              </div>
            ) : null}
            <label>
              <span>插件名称</span>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
                disabled={loading || saving}
              />
            </label>
            <label>
              <span>
                插件代码
                <em className="webplug-byte-count">
                  {contentBytes} / {WEBPLUG_MAX_BYTES} 字节
                </em>
              </span>
              <textarea
                name="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={18}
                spellCheck={false}
                required
                disabled={loading || saving}
                className="webplug-code-input"
              />
            </label>
            {notice ? (
              <p className={`settings-notice ${notice.kind}`}>{notice.text}</p>
            ) : null}
            <div className="webplug-editor-actions">
              <button type="submit" disabled={loading || saving || togglingEnabled}>
                {saving ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                保存插件
              </button>
              <Link href="/settings" className="webplug-back-link">
                返回账号设置
              </Link>
            </div>
          </form>
        ) : (
          <p className="webplug-empty">从左侧选择一个插件，或新建一个。</p>
        )}
      </section>
    </div>
  );
}
