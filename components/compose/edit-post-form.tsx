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
  Send,
  TriangleAlert,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  useRef,
  useState
} from "react";
import { FacePicker } from "@/components/face-picker";
import {
  checksumFile,
  ComposerPreview,
  filesFromClipboard,
  formatFileSize,
  uploadToObjectStorage,
  type AttachmentState,
  type UploadFormResult
} from "@/components/compose/composer";
import type { ForumFace } from "@/lib/types";

type EditPostFormProps = {
  topicId: number;
  contentId: number;
  page: number;
  floor: number;
  initialTitle: string;
  initialContent: string;
  editTitle: boolean;
  needReason: boolean;
  faces: ForumFace[];
};

type EditorSelection = {
  start: number;
  end: number;
};

function topicPath(topicId: number, page: number, floor: number) {
  const query = page > 1 ? `?page=${page}` : "";
  const hash = floor > 0 ? `#floor-${floor}` : "";
  return `/topic/${topicId}${query}${hash}`;
}

export function EditPostForm({
  topicId,
  contentId,
  page,
  floor,
  initialTitle,
  initialContent,
  editTitle,
  needReason,
  faces
}: EditPostFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [editReason, setEditReason] = useState("");
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef({
    start: initialContent.length,
    end: initialContent.length
  });
  const returnPath = topicPath(topicId, page, floor);

  function rememberEditorSelection() {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
  }

  function updateAttachment(id: string, patch: Partial<AttachmentState>) {
    setAttachments((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function insertText(
    text: string,
    inline = false,
    insertionPoint?: EditorSelection
  ) {
    const textarea = textAreaRef.current;
    let cursor = 0;

    setContent((value) => {
      const selection =
        insertionPoint ??
        (textarea && document.activeElement === textarea
          ? {
              start: textarea.selectionStart,
              end: textarea.selectionEnd
            }
          : selectionRef.current);
      const start = Math.min(selection.start, value.length);
      const end = Math.min(Math.max(selection.end, start), value.length);
      const prefix = value.slice(0, start);
      const spacer = inline || !prefix || prefix.endsWith("\n") ? "" : "\n";
      cursor = start + spacer.length + text.length;
      if (insertionPoint) {
        insertionPoint.start = cursor;
        insertionPoint.end = cursor;
      }
      selectionRef.current = { start: cursor, end: cursor };
      return `${prefix}${spacer}${text}${value.slice(end)}`;
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
      selectionRef.current = { start: cursor, end: cursor };
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  async function uploadAttachment(
    file: File,
    id: string,
    insertionPoint: EditorSelection
  ) {
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

      insertText(form.contentUbb, false, insertionPoint);
      updateAttachment(id, {
        status: "done",
        progress: 100,
        downloadUrl: form.downloadUrl,
        contentUbb: form.contentUbb
      });
    } catch (error) {
      updateAttachment(id, {
        status: "error",
        progress: 0,
        notice: error instanceof Error ? error.message : "附件上传失败。"
      });
    }
  }

  async function addAttachments(
    files: File[],
    selection: EditorSelection = selectionRef.current
  ) {
    const insertionPoint = { ...selection };

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
      await uploadAttachment(file, id, insertionPoint);
    }
  }

  async function selectAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await addAttachments(files, selectionRef.current);
  }

  async function pasteAttachments(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = filesFromClipboard(event.clipboardData);
    if (!files.length) return;

    event.preventDefault();
    const selection = {
      start: event.currentTarget.selectionStart,
      end: event.currentTarget.selectionEnd
    };
    selectionRef.current = selection;
    await addAttachments(files, selection);
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(event.currentTarget.action, {
        method: "POST",
        body: new FormData(event.currentTarget)
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
        nextPath?: string;
      };

      if (!response.ok || !result.success) {
        setNotice(result.notice || "保存失败，请稍后重试。");
        return;
      }

      router.push(result.nextPath || returnPath);
      router.refresh();
    } catch {
      setNotice("暂时无法保存修改，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    content.length <= 20000 &&
    (!editTitle || Boolean(title.trim())) &&
    (!needReason || Boolean(editReason.trim()));

  return (
    <form
      className="composer-card edit-composer"
      action={`/api/topics/${topicId}/content/${contentId}`}
      method="post"
      onSubmit={saveChanges}
    >
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="floor" value={floor} />
      <input type="hidden" name="content" value={content} />
      <div className="edit-composer-top">
        <span>{editTitle ? "修改主题" : `修改第 ${floor} 楼`}</span>
        <Link href={returnPath} prefetch={false}>
          取消修改
        </Link>
      </div>
      {editTitle ? (
        <input
          className="composer-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
          aria-label="帖子标题"
        />
      ) : null}
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
        {mode === "write" ? (
          <>
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
                onClick={() =>
                  wrapSelection("[", "](https://)", "链接文字")
                }
                aria-label="插入链接"
                title="插入链接"
              >
                <Link2 size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapSelection("```\n", "\n```", "代码")
                }
                aria-label="代码"
                title="代码"
              >
                <Code2 size={16} />
              </button>
              <button
                type="button"
                onPointerDown={rememberEditorSelection}
                onClick={() => fileInputRef.current?.click()}
                aria-label="添加附件"
                title="添加附件"
              >
                <Paperclip size={16} />
              </button>
              <FacePicker
                faces={faces}
                onSelect={(face) => insertText(`{${face.name}}`, true)}
              />
              <input
                ref={fileInputRef}
                className="attachment-input"
                type="file"
                multiple
                onChange={selectAttachments}
              />
            </div>
            {attachments.length > 0 ? (
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
                    {attachment.downloadUrl || attachment.contentUbb ? (
                      <span className="attachment-actions">
                        {attachment.contentUbb ? (
                          <button
                            type="button"
                            onPointerDown={rememberEditorSelection}
                            onClick={() => insertText(attachment.contentUbb!)}
                          >
                            插入正文
                          </button>
                        ) : null}
                        {attachment.downloadUrl ? (
                          <a
                            href={attachment.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            查看
                          </a>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              ref={textAreaRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                selectionRef.current = {
                  start: event.target.selectionStart,
                  end: event.target.selectionEnd
                };
              }}
              onPaste={pasteAttachments}
              onSelect={rememberEditorSelection}
              maxLength={20000}
              aria-label="帖子内容"
            />
          </>
        ) : (
          <div className="composer-preview" data-math-content>
            <ComposerPreview content={content} faces={faces} />
          </div>
        )}
      </div>
      {needReason ? (
        <label className="edit-reason">
          <span>编辑理由</span>
          <input
            name="editReason"
            value={editReason}
            onChange={(event) => setEditReason(event.target.value)}
            maxLength={200}
            required
          />
        </label>
      ) : null}
      <div className="composer-footer">
        {notice ? (
          <span className="form-notice" role="status">
            {notice}
          </span>
        ) : (
          <span>{content.length} 字</span>
        )}
        <div>
          <Link className="save-draft" href={returnPath} prefetch={false}>
            <X size={16} /> 取消
          </Link>
          <button
            className={`publish-draft ${canSubmit ? "" : "disabled"}`}
            type="submit"
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <>
                <LoaderCircle className="spin" size={16} /> 正在保存
              </>
            ) : (
              <>
                保存修改 <Send size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
