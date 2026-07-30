"use client";

import {
  CheckCircle2,
  LoaderCircle,
  Paperclip,
  Reply,
  TriangleAlert
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition
} from "react";
import {
  checksumFile,
  filesFromClipboard,
  formatFileSize,
  type AttachmentState,
  type UploadFormResult,
  uploadToObjectStorage
} from "@/components/compose/composer";
import { FacePicker } from "@/components/face-picker";
import { useTopicReplyComposer } from "@/components/topic-reply-composer-context";
import type { ForumFace } from "@/lib/types";

type ReplyFormProps = {
  topicId: number;
  currentPage: number;
  floorReverse: boolean;
  userId: number;
  token: string;
  faces: ForumFace[];
  initialNotice?: string;
};

type EditorSelection = {
  start: number;
  end: number;
};

export function ReplyForm({
  topicId,
  currentPage,
  floorReverse,
  userId,
  token,
  faces,
  initialNotice = ""
}: ReplyFormProps) {
  const router = useRouter();
  const { registerComposer } = useTopicReplyComposer();
  const draftKey = `hulvlin-reply-draft:${userId}:${topicId}`;
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [success, setSuccess] = useState(false);
  const [content, setContent] = useState("");
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [pendingFloor, setPendingFloor] = useState<number | null>(null);
  const [updatingReplies, startUpdatingReplies] = useTransition();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  function rememberEditorSelection() {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
  }

  const insertText = useCallback(
    (
      text: string,
      scrollToEditor = false,
      insertionPoint?: EditorSelection
    ) => {
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
        cursor = start + text.length;
        if (insertionPoint) {
          insertionPoint.start = cursor;
          insertionPoint.end = cursor;
        }
        selectionRef.current = { start: cursor, end: cursor };
        return `${value.slice(0, start)}${text}${value.slice(end)}`;
      });

      window.requestAnimationFrame(() => {
        const editor = textAreaRef.current;
        editor?.focus();
        editor?.setSelectionRange(cursor, cursor);
        if (scrollToEditor) {
          editor?.scrollIntoView({ behavior: "instant", block: "nearest" });
        }
      });
    },
    []
  );

  useEffect(() => registerComposer(insertText), [insertText, registerComposer]);

  function insertFace(face: ForumFace) {
    insertText(`{${face.name}}`);
  }

  function updateAttachment(id: string, patch: Partial<AttachmentState>) {
    setAttachments((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
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

  useEffect(() => {
    try {
      const draftContent = localStorage.getItem(draftKey) ?? "";
      setContent(draftContent);
      selectionRef.current = {
        start: draftContent.length,
        end: draftContent.length
      };
    } catch {
      setContent("");
      selectionRef.current = { start: 0, end: 0 };
    }
    setLoadedDraftKey(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (loadedDraftKey !== draftKey) return;

    try {
      if (content) {
        localStorage.setItem(draftKey, content);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      // 浏览器禁用或限制本地存储时仍允许正常回复。
    }
  }, [content, draftKey, loadedDraftKey]);

  useEffect(() => {
    if (updatingReplies || pendingFloor === null) return;

    const target = document.getElementById(`floor-${pendingFloor}`);
    if (!target) return;

    target.scrollIntoView({ behavior: "instant", block: "nearest" });
    setPendingFloor(null);
  }, [pendingFloor, updatingReplies]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    setSuccess(false);

    const form = event.currentTarget;
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form)
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
        floor?: number;
        page?: number;
        nextPath?: string;
      };

      if (!response.ok || !result.success) {
        setNotice(result.notice || "回复失败，请稍后再试。");
        return;
      }

      form.reset();
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // 浏览器禁用或限制本地存储时无需额外处理。
      }
      setContent("");
      setAttachments([]);
      setSuccess(true);
      setNotice("回复已发布。");
      const floor = Number(result.floor);
      if (Number.isInteger(floor) && floor > 0) {
        setPendingFloor(floor);
      }
      startUpdatingReplies(() => {
        if (result.nextPath) {
          router.push(result.nextPath);
          return;
        }
        router.refresh();
      });
    } catch {
      setNotice("暂时无法提交回复，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  const attachmentBusy = attachments.some(
    (attachment) =>
      attachment.status !== "done" && attachment.status !== "error"
  );

  return (
    <form
      className="quick-reply reply-composer"
      id="quick-reply"
      method="post"
      action={`/api/topics/${topicId}/replies`}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="token" value={token} />
      <input
        type="hidden"
        name="reverse"
        value={floorReverse ? "1" : "0"}
      />
      <div>
        <strong>加入这场讨论</strong>
      </div>
      <textarea
        ref={textAreaRef}
        name="content"
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
        required
        minLength={1}
        maxLength={20000}
        placeholder="写下你的回复…"
        aria-label="回复内容"
      />
      <div className="reply-editor-tools">
        <button
          type="button"
          onPointerDown={rememberEditorSelection}
          onClick={() => fileInputRef.current?.click()}
          aria-label="添加附件"
          title="添加附件"
        >
          <Paperclip size={16} />
          <span>附件</span>
        </button>
        <FacePicker faces={faces} onSelect={insertFace} />
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
                          ? "已添加到回复"
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
                      插入回复
                    </button>
                  ) : null}
                  {attachment.downloadUrl ? (
                    <a
                      href={attachment.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      查看附件
                    </a>
                  ) : null}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="reply-composer-footer">
        {notice ? (
          <p className={success ? "reply-success" : "form-notice"}>
            {notice}
          </p>
        ) : (
          <span>支持虎绿林 UBB、Markdown 与 LaTeX 公式</span>
        )}
        <button
          type="submit"
          disabled={loading || updatingReplies || attachmentBusy}
        >
          {loading || updatingReplies ? (
            <>
              <LoaderCircle className="spin" size={16} />{" "}
              {loading ? "正在发布" : "正在显示回复"}
            </>
          ) : attachmentBusy ? (
            <>
              <LoaderCircle className="spin" size={16} /> 正在处理附件
            </>
          ) : (
            <>
              发布回复 <Reply size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
