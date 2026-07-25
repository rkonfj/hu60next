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

type ForumOption = {
  id: number;
  name: string;
};

type ForumNode = ForumOption & {
  postable: boolean;
  children: ForumOption[];
};

type PickerLevel = {
  options: ForumOption[];
  selected: string;
};

export function Composer({ rootForums }: { rootForums: ForumOption[] }) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [levels, setLevels] = useState<PickerLevel[]>([
    { options: rootForums, selected: "" }
  ]);
  const [targetForum, setTargetForum] = useState<ForumNode | null>(null);
  const [forumPath, setForumPath] = useState<string[]>([]);
  const [loadingForum, setLoadingForum] = useState(false);

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
    localStorage.setItem(
      "hulvlin-draft",
      JSON.stringify({
        title,
        content,
        forumId: targetForum?.postable ? targetForum.id : null,
        forumPath
      })
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function insertToken(before: string, after = "") {
    setContent((value) => `${value}${value ? "\n" : ""}${before}${after}`);
    setMode("write");
  }

  async function selectForum(levelIndex: number, value: string) {
    const selectedId = Number(value);
    const currentLevel = levels[levelIndex];
    const selectedOption = currentLevel.options.find(
      (option) => option.id === selectedId
    );
    const nextPath = [
      ...forumPath.slice(0, levelIndex),
      ...(selectedOption ? [selectedOption.name] : [])
    ];

    setLevels((current) =>
      current.slice(0, levelIndex + 1).map((level, index) =>
        index === levelIndex ? { ...level, selected: value } : level
      )
    );
    setForumPath(nextPath);
    setTargetForum(null);

    if (!value) return;

    setLoadingForum(true);
    try {
      const response = await fetch(`/api/forums/${selectedId}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Forum request failed");
      const node = (await response.json()) as ForumNode;
      setTargetForum(node);

      if (node.children.length) {
        setLevels((current) => [
          ...current.slice(0, levelIndex + 1),
          { options: node.children, selected: "" }
        ]);
      }
    } catch {
      setTargetForum({
        id: selectedId,
        name: selectedOption?.name ?? "所选版块",
        postable: true,
        children: []
      });
    } finally {
      setLoadingForum(false);
    }
  }

  return (
    <div className="composer-card">
      <div className="composer-top">
        <div className="composer-forum-picker" id="forum-picker">
          <span>发布到</span>
          <div className="forum-selects">
            {levels.map((level, index) => (
              <select
                key={`${index}-${level.options[0]?.id ?? "empty"}`}
                value={level.selected}
                onChange={(event) => selectForum(index, event.target.value)}
                aria-label={index === 0 ? "选择主版块" : `选择第${index + 1}级子版块`}
              >
                <option value="">
                  {index === 0 ? "选择主版块" : "可继续选择子版块"}
                </option>
                {level.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <small
            className={
              targetForum?.postable ? "forum-target valid" : "forum-target"
            }
          >
            {loadingForum
              ? "正在读取子版块…"
              : targetForum?.postable
                ? `当前发布到：${forumPath.join(" / ")}`
                : targetForum
                  ? "这是分类目录，请继续选择具体子版块"
                  : "请选择发布版块"}
          </small>
        </div>
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
          <a
            className={`publish-draft ${
              targetForum?.postable ? "" : "disabled"
            }`}
            href={targetForum?.postable ? "/login" : "#forum-picker"}
            aria-disabled={!targetForum?.postable}
          >
            {targetForum?.postable ? "登录后发布" : "先选择版块"}{" "}
            <Send size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
