"use client";

import {
  Bold,
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  Link2,
  LoaderCircle,
  Paperclip,
  Save,
  Send,
  Smile,
  TriangleAlert
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState
} from "react";
import SparkMD5 from "spark-md5";
import type { ForumTree } from "@/lib/types";

type PickerLevel = {
  options: ForumTree[];
  selected: string;
};

type AttachmentState = {
  id: string;
  name: string;
  size: number;
  status: "hashing" | "signing" | "uploading" | "done" | "error";
  progress: number;
  notice?: string;
  downloadUrl?: string;
};

type UploadFormResult = {
  success?: boolean;
  notice?: string;
  requestUrl?: string;
  method?: string;
  fileFieldName?: string;
  formData?: Record<string, string>;
  fileExists?: boolean;
  downloadUrl?: string;
  contentUbb?: string;
};

type SavedDraft = {
  title?: string;
  content?: string;
  forumId?: number | null;
  forumPath?: string[];
};

function restoreForumPicker(
  rootForums: ForumTree[],
  forumId?: number | null
) {
  if (!forumId) return null;

  function findPath(
    forums: ForumTree[],
    path: ForumTree[] = []
  ): ForumTree[] | null {
    for (const forum of forums) {
      const nextPath = [...path, forum];
      if (forum.id === forumId) return nextPath;
      const childPath = findPath(forum.child, nextPath);
      if (childPath) return childPath;
    }
    return null;
  }

  const path = findPath(rootForums);
  if (!path?.length) return null;

  const levels: PickerLevel[] = [];
  let options = rootForums;
  for (const forum of path) {
    levels.push({ options, selected: String(forum.id) });
    options = forum.child;
  }
  if (options.length) {
    levels.push({ options, selected: "" });
  }

  return {
    levels,
    targetForum: path.at(-1) ?? null,
    forumPath: path.map((forum) => forum.name)
  };
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function checksumFile(
  file: File,
  onProgress: (progress: number) => void
) {
  const spark = new SparkMD5.ArrayBuffer();
  const chunkSize = 2 * 1024 * 1024;
  const chunkCount = Math.max(1, Math.ceil(file.size / chunkSize));

  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    spark.append(await file.slice(start, end).arrayBuffer());
    onProgress(Math.round(((index + 1) / chunkCount) * 100));
  }

  return spark.end();
}

function uploadToObjectStorage(
  file: File,
  form: UploadFormResult,
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    if (!form.requestUrl || !form.formData) {
      reject(new Error("附件上传凭证不完整。"));
      return;
    }

    const body = new FormData();
    Object.entries(form.formData).forEach(([key, value]) => {
      body.append(key, value);
    });
    body.append(form.fileFieldName || "file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open(form.method || "POST", form.requestUrl);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`对象存储返回 ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => {
      reject(new Error("附件上传连接中断。"));
    });
    xhr.send(body);
  });
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/)[^)]+\))/g
  );

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)$/);
    if (link) {
      return (
        <a href={link[2]} key={index} rel="noreferrer" target="_blank">
          {link[1]}
        </a>
      );
    }

    return part;
  });
}

function ComposerPreview({ content }: { content: string }) {
  if (!content) {
    return <span>还没有可以预览的内容。</span>;
  }

  return content.split("\n").map((line, index) => {
    const attachment = line
      .trim()
      .match(/^《(图片|视频流|音频流|链接)：(.+?)，(.+?)（(.+?)）》$/);
    if (attachment) {
      const [, type, url, name, size] = attachment;
      if (type === "图片") {
        return (
          <figure className="composer-attachment-preview" key={index}>
            <img alt={name} loading="lazy" src={url} />
            <figcaption>
              {name} · {size}
            </figcaption>
          </figure>
        );
      }
      return (
        <p className="composer-attachment-link" key={index}>
          <Paperclip size={14} />
          <a href={url} rel="noreferrer" target="_blank">
            {name}
          </a>
          <span>{size}</span>
        </p>
      );
    }
    const image = line
      .trim()
      .match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)]+)\)$/);
    if (image) {
      return <img alt={image[1]} key={index} loading="lazy" src={image[2]} />;
    }
    if (line.startsWith("### ")) {
      return <h4 key={index}>{renderInline(line.slice(4))}</h4>;
    }
    if (line.startsWith("## ")) {
      return <h3 key={index}>{renderInline(line.slice(3))}</h3>;
    }
    if (line.startsWith("# ")) {
      return <h2 key={index}>{renderInline(line.slice(2))}</h2>;
    }
    if (line.startsWith("> ")) {
      return <blockquote key={index}>{renderInline(line.slice(2))}</blockquote>;
    }

    return <p key={index}>{line ? renderInline(line) : <br />}</p>;
  });
}

export function Composer({
  rootForums,
  isLogin
}: {
  rootForums: ForumTree[];
  isLogin: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [draftNoticeError, setDraftNoticeError] = useState(false);
  const [levels, setLevels] = useState<PickerLevel[]>([
    { options: rootForums, selected: "" }
  ]);
  const [targetForum, setTargetForum] = useState<ForumTree | null>(null);
  const [forumPath, setForumPath] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hulvlin-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as SavedDraft;
      setTitle(draft.title ?? "");
      setContent(draft.content ?? "");
      const restored = restoreForumPicker(rootForums, draft.forumId);
      if (restored) {
        setLevels(restored.levels);
        setTargetForum(restored.targetForum);
        setForumPath(restored.forumPath);
      }
      setDraftNotice(
        restored
          ? "已恢复本地草稿和所选板块。"
          : "已恢复本地草稿。"
      );
      setDraftNoticeError(false);
      window.setTimeout(() => setDraftNotice(""), 2600);
    } catch {
      try {
        localStorage.removeItem("hulvlin-draft");
      } catch {
        // The editor remains usable when browser storage is unavailable.
      }
    }
  }, [rootForums]);

  function saveDraft() {
    try {
      localStorage.setItem(
        "hulvlin-draft",
        JSON.stringify({
          title,
          content,
          forumId: targetForum?.id ?? null,
          forumPath
        })
      );
      setSaved(true);
      setDraftNoticeError(false);
      setDraftNotice(
        targetForum
          ? `草稿已保存，板块：${forumPath.join(" / ")}`
          : "草稿已保存，尚未选择板块。"
      );
      window.setTimeout(() => {
        setSaved(false);
        setDraftNotice("");
      }, 2600);
    } catch {
      setSaved(false);
      setDraftNoticeError(true);
      setDraftNotice("草稿保存失败，请检查浏览器存储权限。");
    }
  }

  function insertText(text: string) {
    const textarea = textAreaRef.current;
    let cursor = 0;

    setContent((value) => {
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? start;
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);
      const spacer = prefix && !prefix.endsWith("\n") ? "\n" : "";
      cursor = start + spacer.length + text.length;
      return `${prefix}${spacer}${text}${suffix}`;
    });
    setMode("write");

    window.requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function wrapSelection(before: string, after: string, placeholder: string) {
    const textarea = textAreaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = content.slice(start, end) || placeholder;
    const text = `${before}${selected}${after}`;

    setContent((value) => `${value.slice(0, start)}${text}${value.slice(end)}`);
    setMode("write");

    window.requestAnimationFrame(() => {
      const cursor = start + text.length;
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function selectForum(levelIndex: number, value: string) {
    const currentLevel = levels[levelIndex];
    const selectedNode = currentLevel.options.find(
      (option) => String(option.id) === value
    );
    const parentLevel = levelIndex > 0 ? levels[levelIndex - 1] : undefined;
    const parentNode = parentLevel?.options.find(
      (option) => String(option.id) === parentLevel.selected
    );
    const nextPath = [
      ...forumPath.slice(0, levelIndex),
      ...(selectedNode ? [selectedNode.name] : [])
    ];
    const nextLevels = levels
      .slice(0, levelIndex + 1)
      .map((level, index) =>
        index === levelIndex ? { ...level, selected: value } : level
      );

    if (selectedNode?.child.length) {
      nextLevels.push({ options: selectedNode.child, selected: "" });
    }

    setLevels(nextLevels);
    setForumPath(nextPath);
    setTargetForum(selectedNode ?? parentNode ?? null);
  }

  function updateAttachment(id: string, patch: Partial<AttachmentState>) {
    setAttachments((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function uploadAttachment(file: File, id: string) {
    try {
      const md5 = await checksumFile(file, (progress) => {
        updateAttachment(id, { status: "hashing", progress });
      });
      updateAttachment(id, { status: "signing", progress: 0 });

      const response = await fetch("/api/attachments/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, md5 })
      });
      const form = (await response.json()) as UploadFormResult;

      if (
        !response.ok ||
        !form.success ||
        !form.contentUbb ||
        !form.downloadUrl
      ) {
        throw new Error(form.notice || "获取附件上传凭证失败。");
      }

      if (!form.fileExists) {
        updateAttachment(id, { status: "uploading", progress: 0 });
        await uploadToObjectStorage(file, form, (progress) => {
          updateAttachment(id, { status: "uploading", progress });
        });
      }

      insertText(form.contentUbb);
      updateAttachment(id, {
        status: "done",
        progress: 100,
        downloadUrl: form.downloadUrl
      });
    } catch (error) {
      updateAttachment(id, {
        status: "error",
        progress: 0,
        notice: error instanceof Error ? error.message : "附件上传失败。"
      });
    }
  }

  async function selectAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    for (const [index, file] of files.entries()) {
      const id = `${Date.now()}-${index}-${file.name}`;
      setAttachments((current) => [
        ...current,
        {
          id,
          name: file.name,
          size: file.size,
          status: "hashing",
          progress: 0
        }
      ]);
      await uploadAttachment(file, id);
    }
  }

  const canPostToTarget = Boolean(
    targetForum && Number(targetForum.notopic) !== 1
  );
  const canSubmit =
    canPostToTarget && Boolean(title.trim()) && Boolean(content.trim());

  async function publishTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !isLogin || publishing) return;

    setPublishing(true);
    setPublishNotice("");
    const form = event.currentTarget;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form)
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
        topicId?: number | null;
        forumId?: number;
      };

      if (!response.ok || !result.success) {
        setPublishNotice(result.notice || "发布失败，请稍后再试。");
        return;
      }

      try {
        localStorage.removeItem("hulvlin-draft");
      } catch {
        // Publishing succeeded even when local storage is unavailable.
      }
      router.push(
        result.topicId
          ? `/topic/${result.topicId}`
          : `/forum/${result.forumId ?? targetForum?.id}`
      );
      router.refresh();
    } catch {
      setPublishNotice("暂时无法提交主题，请稍后再试。");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <form
      className="composer-card"
      method="post"
      action="/api/topics"
      onSubmit={publishTopic}
    >
      <input
        type="hidden"
        name="forumId"
        value={canPostToTarget ? targetForum?.id : ""}
      />
      <input type="hidden" name="content" value={content} />
      <div className="composer-top">
        <div className="composer-forum-picker" id="forum-picker">
          <span>发布到</span>
          <div className="forum-selects">
            {levels.map((level, index) => (
              <select
                key={`${index}-${level.options[0]?.id ?? "empty"}`}
                value={level.selected}
                onChange={(event) => selectForum(index, event.target.value)}
                aria-label={
                  index === 0 ? "选择主板块" : `选择第${index + 1}级子板块`
                }
              >
                <option value="">
                  {index === 0 ? "选择主板块" : "可继续选择子板块"}
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
            className={canPostToTarget ? "forum-target valid" : "forum-target"}
          >
            {canPostToTarget
              ? `当前发布到：${forumPath.join(" / ")}`
              : targetForum
                ? "这是分类目录，请继续选择具体子板块"
                : "请选择发布板块"}
          </small>
        </div>
        <span className="draft-state">
          <Save size={14} />
          {saved ? "草稿已保存" : "草稿仅保存在本机"}
        </span>
      </div>
      <input
        className="composer-title"
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="一句清楚的标题，会带来更好的讨论"
        maxLength={120}
        required
      />
      <div className="editor-shell">
        <div className="editor-tabs">
          <button
            className={mode === "write" ? "active" : ""}
            onClick={() => setMode("write")}
            type="button"
            aria-pressed={mode === "write"}
          >
            <FileText size={15} /> 撰写
          </button>
          <button
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
            type="button"
            aria-pressed={mode === "preview"}
          >
            <Eye size={15} /> 预览
          </button>
        </div>
        {mode === "write" && (
          <div className="editor-toolbar">
            <button
              type="button"
              onClick={() => wrapSelection("**", "**", "粗体")}
              aria-label="粗体"
              title="粗体"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("[", "](https://)", "链接文字")}
              aria-label="插入链接"
              title="插入链接"
            >
              <Link2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("```\n", "\n```", "代码")}
              aria-label="代码"
              title="代码"
            >
              <Code2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="添加附件"
              title="添加附件"
            >
              <Paperclip size={16} />
            </button>
            <button
              type="button"
              onClick={() => insertText("🙂")}
              aria-label="插入表情"
              title="插入表情"
            >
              <Smile size={16} />
            </button>
            <input
              ref={fileInputRef}
              className="attachment-input"
              type="file"
              multiple
              onChange={selectAttachments}
            />
          </div>
        )}
        {attachments.length > 0 && (
          <div className="attachment-list" aria-live="polite">
            {attachments.map((attachment) => (
              <div className="attachment-item" key={attachment.id}>
                <span className="attachment-state-icon">
                  {attachment.status === "done" ? (
                    <CheckCircle2 size={15} />
                  ) : attachment.status === "error" ? (
                    <TriangleAlert size={15} />
                  ) : (
                    <LoaderCircle className="spin" size={15} />
                  )}
                </span>
                <span className="attachment-copy">
                  <strong>{attachment.name}</strong>
                  <small>
                    {formatFileSize(attachment.size)}
                    {" · "}
                    {attachment.status === "hashing"
                      ? `正在校验 ${attachment.progress}%`
                      : attachment.status === "signing"
                        ? "正在获取上传凭证"
                        : attachment.status === "uploading"
                          ? `正在上传 ${attachment.progress}%`
                          : attachment.status === "done"
                            ? "已添加到正文"
                            : attachment.notice || "上传失败"}
                  </small>
                </span>
                {attachment.downloadUrl && (
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        {mode === "write" ? (
          <textarea
            ref={textAreaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="描述背景、已经尝试过的方案，以及你真正想讨论的问题……"
          />
        ) : (
          <div className="composer-preview">
            <ComposerPreview content={content} />
          </div>
        )}
      </div>
      <div className="composer-footer">
        {publishNotice ? (
          <span className="form-notice">{publishNotice}</span>
        ) : draftNotice ? (
          <span
            className={
              draftNoticeError
                ? "form-notice"
                : "form-notice draft-save-success"
            }
            role="status"
            aria-live="polite"
          >
            {draftNoticeError ? (
              <TriangleAlert size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {draftNotice}
          </span>
        ) : (
          <span>{content.length} 字</span>
        )}
        <div>
          <button className="save-draft" type="button" onClick={saveDraft}>
            <Save size={16} /> 保存草稿
          </button>
          {!canPostToTarget ? (
            <button className="publish-draft disabled" type="button" disabled>
              先选择板块 <Send size={16} />
            </button>
          ) : !isLogin ? (
            <a className="publish-draft" href="/login?next=/compose">
              登录后发布 <Send size={16} />
            </a>
          ) : (
            <button
              className={`publish-draft ${canSubmit ? "" : "disabled"}`}
              type="submit"
              disabled={!canSubmit || publishing}
            >
              {publishing ? (
                <>
                  <LoaderCircle className="spin" size={16} /> 正在发布
                </>
              ) : (
                <>
                  发布讨论 <Send size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
