"use client";

import {
  Bold,
  Code2,
  Eye,
  FileText,
  ImagePlus,
  Link2,
  Save,
  Send,
  Smile
} from "lucide-react";
import { useEffect, useState } from "react";

export function Composer() {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("hulvlin-draft");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { title?: string; content?: string };
      setTitle(draft.title ?? "");
      setContent(draft.content ?? "");
    } catch {
      localStorage.removeItem("hulvlin-draft");
    }
  }, []);

  function saveDraft() {
    localStorage.setItem("hulvlin-draft", JSON.stringify({ title, content }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function insertToken(before: string, after = "") {
    setContent((value) => `${value}${value ? "\n" : ""}${before}${after}`);
    setMode("write");
  }

  return (
    <div className="composer-card">
      <div className="composer-top">
        <label>
          <span>发布到</span>
          <select defaultValue="212" aria-label="选择版块">
            <option value="212">软件开发</option>
            <option value="139">电脑</option>
            <option value="142">人工智能</option>
            <option value="206">移动设备</option>
            <option value="47">建站</option>
          </select>
        </label>
        <span className="draft-state">
          <Save size={14} />
          {saved ? "草稿已保存" : "草稿仅保存在本机"}
        </span>
      </div>
      <input
        className="composer-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="一句清楚的标题，会带来更好的讨论"
        maxLength={120}
      />
      <div className="editor-shell">
        <div className="editor-tabs">
          <button
            className={mode === "write" ? "active" : ""}
            onClick={() => setMode("write")}
            type="button"
          >
            <FileText size={15} /> 撰写
          </button>
          <button
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
            type="button"
          >
            <Eye size={15} /> 预览
          </button>
        </div>
        <div className="editor-toolbar">
          <button type="button" onClick={() => insertToken("**粗体**")}>
            <Bold size={16} />
          </button>
          <button type="button" onClick={() => insertToken("[链接](https://)")}>
            <Link2 size={16} />
          </button>
          <button type="button" onClick={() => insertToken("```\n代码\n```")}>
            <Code2 size={16} />
          </button>
          <button type="button" onClick={() => insertToken("[图片]")}>
            <ImagePlus size={16} />
          </button>
          <button type="button" onClick={() => insertToken("🙂")}>
            <Smile size={16} />
          </button>
        </div>
        {mode === "write" ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="描述背景、已经尝试过的方案，以及你真正想讨论的问题……"
          />
        ) : (
          <div className="composer-preview">
            {content ? (
              content.split("\n").map((line, index) => (
                <p key={`${line}-${index}`}>{line || <br />}</p>
              ))
            ) : (
              <span>还没有可以预览的内容。</span>
            )}
          </div>
        )}
      </div>
      <div className="composer-footer">
        <span>{content.length} 字</span>
        <div>
          <button className="save-draft" type="button" onClick={saveDraft}>
            <Save size={16} /> 保存草稿
          </button>
          <a className="publish-draft" href="/login">
            登录后发布 <Send size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
