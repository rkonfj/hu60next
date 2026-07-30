"use client";

import {
  Bold,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Eye,
  FileText,
  Link2,
  LoaderCircle,
  Paperclip,
  Plus,
  Save,
  Send,
  Trash2,
  Vote,
  TriangleAlert
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState
} from "react";
import SparkMD5 from "spark-md5";
import { FacePicker } from "@/components/face-picker";
import { highlightCode } from "@/lib/highlight";
import {
  resolveSafeMediaUrl,
  resolveUbbVideoEmbedUrl
} from "@/lib/media";
import type { ForumFace, ForumTree } from "@/lib/types";

type PickerLevel = {
  options: ForumTree[];
  selected: string;
};

export type AttachmentState = {
  id: string;
  name: string;
  size: number;
  status: "hashing" | "signing" | "uploading" | "done" | "error";
  progress: number;
  notice?: string;
  downloadUrl?: string;
  contentUbb?: string;
};

type EditorSelection = {
  start: number;
  end: number;
};

export function filesFromClipboard(data: DataTransfer) {
  const itemFiles = Array.from(data.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  return itemFiles.length ? itemFiles : Array.from(data.files);
}

export type UploadFormResult = {
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
  vote?: DraftVote | null;
};

type DraftVote = {
  question: string;
  options: string[];
  until: string;
};

const voteUbbPattern =
  /\[vote(?:\s+[^\]]*)?\][\s\S]*?\[\/vote\]/i;

function formatVoteUbb(vote: DraftVote) {
  const deadline = vote.until
    ? ` until="${vote.until.replace("T", " ")}"`
    : "";
  return `[vote${deadline}]\n${vote.question}\n\n${vote.options.join("\n")}\n[/vote]`;
}

function replaceVoteUbb(content: string, vote: DraftVote) {
  const formatted = formatVoteUbb(vote);
  return voteUbbPattern.test(content)
    ? content.replace(voteUbbPattern, formatted)
    : `${content.trimEnd()}${content.trim() ? "\n" : ""}${formatted}`;
}

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

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export async function checksumFile(
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

export function uploadToObjectStorage(
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

function renderInline(
  text: string,
  faceMap: Map<string, string>
): ReactNode[] {
  const parts = text.split(
    /(\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/)[^)]+\)|\{[^{}]{1,16}\})/g
  );

  return parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return part;
    }
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

    const faceName = part.match(/^\{([^{}]{1,16})\}$/)?.[1];
    const faceUrl = faceName ? faceMap.get(faceName) : undefined;
    if (faceName && faceUrl) {
      return (
        <img
          className="hu60_face"
          src={faceUrl}
          alt={faceName}
          title={faceName}
          loading="lazy"
          key={index}
        />
      );
    }

    return part;
  });
}

function stripPreviewComments(content: string) {
  const protectedCode: string[] = [];
  const protectedContent = content
    .replace(
      /(^|\n)(```|~~~)[^\n]*\n[\s\S]*?(?:\n\2(?=\n|$)|$)/g,
      (source) => {
        const index = protectedCode.push(source) - 1;
        return `\uE000HU60_PREVIEW_CODE_${index}\uE001`;
      }
    )
    .replace(/`[^`\n]*`/g, (source) => {
      const index = protectedCode.push(source) - 1;
      return `\uE000HU60_PREVIEW_CODE_${index}\uE001`;
    });

  return protectedContent
    .replace(/\[comment\][\s\S]*?\[\/comment\]/gi, "")
    .replace(
      /\uE000HU60_PREVIEW_CODE_(\d+)\uE001/g,
      (source, rawIndex: string) =>
        protectedCode[Number(rawIndex)] ?? source
    );
}

export function ComposerPreview({
  content,
  faces
}: {
  content: string;
  faces: ForumFace[];
}) {
  if (!content) {
    return <span>还没有可以预览的内容。</span>;
  }

  const faceMap = new Map(faces.map((face) => [face.name, face.url]));
  const previewContent = stripPreviewComments(content).replace(
    /^<!--\s*markdown\s*-->\s*\n?/i,
    ""
  );
  const lines = previewContent.split("\n");
  const preview: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\[vote(?:\s+[^\]]*)?\]\s*$/i.test(line.trim())) {
      const closingIndex = lines.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > index && /^\[\/vote\]\s*$/i.test(candidate.trim())
      );
      if (closingIndex > index) {
        const voteLines = lines
          .slice(index + 1, closingIndex)
          .map((value) => value.trim())
          .filter(Boolean);
        const [question, ...options] = voteLines;
        const deadline = line.match(
          /\buntil\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\]\s]+))/i
        );
        const deadlineValue =
          deadline?.[1] ?? deadline?.[2] ?? deadline?.[3];
        preview.push(
          <section className="composer-vote-preview" key={`vote-${index}`}>
            <Vote size={18} />
            <div>
              <strong>{question || "投票标题"}</strong>
              <span>
                {options.length
                  ? `${options.length} 个选项`
                  : "请至少填写两个选项"}
                {deadlineValue ? ` · 截止 ${deadlineValue}` : ""}
              </span>
            </div>
          </section>
        );
        index = closingIndex;
        continue;
      }
    }
    if (line.trim() === "$$") {
      const closingIndex = lines.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > index && candidate.trim() === "$$"
      );
      if (closingIndex > index) {
        preview.push(
          <div
            className="composer-math-block"
            data-latex-display
            key={`math-${index}`}
          >
            {lines.slice(index + 1, closingIndex).join("\n")}
          </div>
        );
        index = closingIndex;
        continue;
      }
    }

    const fence = line.trim().match(/^(```|~~~)\s*([a-z0-9_+#.-]*)\s*$/i);
    if (fence) {
      const codeLines: string[] = [];
      const closingFence = fence[1];

      while (
        index + 1 < lines.length &&
        lines[index + 1].trim() !== closingFence
      ) {
        codeLines.push(lines[index + 1]);
        index += 1;
      }
      if (index + 1 < lines.length) index += 1;

      const highlighted = highlightCode(codeLines.join("\n"), fence[2]);
      preview.push(
        <div
          className="code-block-shell"
          data-language={highlighted.language}
          key={`code-${index}`}
        >
          <button
            className="code-copy-button"
            type="button"
            data-copy-code
            aria-label="复制代码"
          >
            <Copy className="code-copy-icon" size={15} aria-hidden="true" />
            <Check
              className="code-copy-success-icon"
              size={15}
              aria-hidden="true"
            />
          </button>
          <pre className="syntax-highlight">
            <code
              className={
                highlighted.language
                  ? `hljs language-${highlighted.language}`
                  : "hljs"
              }
              dangerouslySetInnerHTML={{ __html: highlighted.html }}
            />
          </pre>
        </div>
      );
      continue;
    }

    const embeddedVideo = line.trim().match(/^《视频：(.+?)》$/);
    if (embeddedVideo) {
      const source = embeddedVideo[1];
      const embedUrl = resolveUbbVideoEmbedUrl(source);
      const sourceUrl = resolveSafeMediaUrl(source);
      preview.push(
        embedUrl ? (
          <figure className="composer-media-preview" key={index}>
            <iframe
              className="hu60-video-frame"
              src={embedUrl}
              title="嵌入视频播放器"
              loading="lazy"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-presentation"
            />
            <figcaption>
              <a href={sourceUrl || undefined} rel="noreferrer" target="_blank">
                打开视频原页面
              </a>
            </figcaption>
          </figure>
        ) : sourceUrl ? (
          <p className="composer-attachment-link" key={index}>
            <a href={sourceUrl} rel="noreferrer" target="_blank">
              {source}
            </a>
          </p>
        ) : (
          <p className="composer-attachment-link" key={index}>
            {source}
          </p>
        )
      );
      continue;
    }

    const stream = line.trim().match(/^《(视频流|音频流)：(.+?)》$/);
    if (stream) {
      const [, type, source] = stream;
      const mediaUrl = resolveSafeMediaUrl(source);
      preview.push(
        mediaUrl ? (
          type === "视频流" ? (
            <video
              className="hu60-video-native composer-media-preview"
              src={mediaUrl}
              controls
              playsInline
              preload="metadata"
              key={index}
            />
          ) : (
            <audio
              className="hu60-audio-native composer-media-preview"
              src={mediaUrl}
              controls
              preload="metadata"
              key={index}
            />
          )
        ) : (
          <p className="composer-attachment-link" key={index}>
            {source}
          </p>
        )
      );
      continue;
    }

    const attachment = line
      .trim()
      .match(/^《(图片|视频流|音频流|链接)：(.+?)，(.+?)（(.+?)）》$/);
    if (attachment) {
      const [, type, url, name, size] = attachment;
      if (type === "图片") {
        preview.push(
          <figure className="composer-attachment-preview" key={index}>
            <img alt={name} loading="lazy" src={url} />
            <figcaption>
              {name} · {size}
            </figcaption>
          </figure>
        );
        continue;
      }
      const mediaUrl = resolveSafeMediaUrl(url);
      if (type === "视频流" && mediaUrl) {
        preview.push(
          <figure className="composer-media-preview" key={index}>
            <video
              className="hu60-video-native"
              src={mediaUrl}
              controls
              playsInline
              preload="metadata"
            />
            <figcaption>
              {name} · {size}
            </figcaption>
          </figure>
        );
        continue;
      }
      if (type === "音频流" && mediaUrl) {
        preview.push(
          <figure className="composer-media-preview" key={index}>
            <audio
              className="hu60-audio-native"
              src={mediaUrl}
              controls
              preload="metadata"
            />
            <figcaption>
              {name} · {size}
            </figcaption>
          </figure>
        );
        continue;
      }
      preview.push(
        <p className="composer-attachment-link" key={index}>
          <Paperclip size={14} />
          <a href={url} rel="noreferrer" target="_blank">
            {name}
          </a>
          <span>{size}</span>
        </p>
      );
      continue;
    }
    const image = line
      .trim()
      .match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)]+)\)$/);
    if (image) {
      preview.push(
        <img alt={image[1]} key={index} loading="lazy" src={image[2]} />
      );
      continue;
    }
    if (line.startsWith("### ")) {
      preview.push(
        <h4 key={index}>{renderInline(line.slice(4), faceMap)}</h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      preview.push(
        <h3 key={index}>{renderInline(line.slice(3), faceMap)}</h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      preview.push(
        <h2 key={index}>{renderInline(line.slice(2), faceMap)}</h2>
      );
      continue;
    }
    if (line.startsWith("> ")) {
      preview.push(
        <blockquote key={index}>
          {renderInline(line.slice(2), faceMap)}
        </blockquote>
      );
      continue;
    }

    preview.push(
      <p key={index}>{line ? renderInline(line, faceMap) : <br />}</p>
    );
  }

  return preview;
}

export function Composer({
  rootForums,
  isLogin,
  faces,
  initialForumId
}: {
  rootForums: ForumTree[];
  isLogin: boolean;
  faces: ForumFace[];
  initialForumId?: number | null;
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
  const [voteDraft, setVoteDraft] = useState<DraftVote | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState("");
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

  useEffect(() => {
    let draft: SavedDraft = {};
    try {
      const raw = localStorage.getItem("hulvlin-draft");
      if (raw) {
        draft = JSON.parse(raw) as SavedDraft;
        setTitle(draft.title ?? "");
        let draftContent = draft.content ?? "";
        if (
          draft.vote &&
          typeof draft.vote.question === "string" &&
          Array.isArray(draft.vote.options)
        ) {
          const restoredVote = {
            question: draft.vote.question,
            options: draft.vote.options
              .map(String)
              .slice(0, 12),
            until:
              typeof draft.vote.until === "string"
                ? draft.vote.until
                : ""
          };
          setVoteDraft(restoredVote);
          draftContent = replaceVoteUbb(draftContent, restoredVote);
        }
        setContent(draftContent);
        selectionRef.current = {
          start: draftContent.length,
          end: draftContent.length
        };
      }
      const restored =
        restoreForumPicker(rootForums, initialForumId) ??
        restoreForumPicker(rootForums, draft.forumId);
      if (restored) {
        setLevels(restored.levels);
        setTargetForum(restored.targetForum);
        setForumPath(restored.forumPath);
      }
      if (raw) {
        setDraftNotice(
          restored
            ? "已恢复本地草稿和所选板块。"
            : "已恢复本地草稿。"
        );
        setDraftNoticeError(false);
        window.setTimeout(() => setDraftNotice(""), 2600);
      }
    } catch {
      try {
        localStorage.removeItem("hulvlin-draft");
      } catch {
        // The editor remains usable when browser storage is unavailable.
      }
    }
  }, [initialForumId, rootForums]);

  function saveDraft() {
    try {
      localStorage.setItem(
        "hulvlin-draft",
        JSON.stringify({
          title,
          content,
          forumId: targetForum?.id ?? null,
          forumPath,
          vote: voteDraft
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

  function insertText(text: string, insertionPoint?: EditorSelection) {
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
      const suffix = value.slice(end);
      const spacer = prefix && !prefix.endsWith("\n") ? "\n" : "";
      cursor = start + spacer.length + text.length;
      if (insertionPoint) {
        insertionPoint.start = cursor;
        insertionPoint.end = cursor;
      }
      selectionRef.current = { start: cursor, end: cursor };
      return `${prefix}${spacer}${text}${suffix}`;
    });
    setMode("write");

    window.requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function insertInlineText(text: string) {
    const textarea = textAreaRef.current;
    let cursor = 0;

    setContent((value) => {
      const selection =
        textarea && document.activeElement === textarea
          ? {
              start: textarea.selectionStart,
              end: textarea.selectionEnd
            }
          : selectionRef.current;
      const start = Math.min(selection.start, value.length);
      const end = Math.min(Math.max(selection.end, start), value.length);
      cursor = start + text.length;
      selectionRef.current = { start: cursor, end: cursor };
      return `${value.slice(0, start)}${text}${value.slice(end)}`;
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

  function toggleVoteDraft() {
    if (voteDraft) {
      setVoteDraft(null);
      setContent((value) =>
        value
          .replace(
            /(?:^|\n)\s*\[vote(?:\s+[^\]]*)?\][\s\S]*?\[\/vote\]\s*(?=\n|$)/i,
            ""
          )
          .replace(/^\n+|\n+$/g, "")
      );
      return;
    }

    const nextVote = {
      question: title.trim() || "投票标题",
      options: ["选项 1", "选项 2"],
      until: ""
    };
    setVoteDraft(nextVote);
    insertText(formatVoteUbb(nextVote));
  }

  function applyVoteDraft(nextVote: DraftVote) {
    setVoteDraft(nextVote);
    setContent((value) => replaceVoteUbb(value, nextVote));
  }

  function updateVoteOption(index: number, value: string) {
    if (!voteDraft) return;
    applyVoteDraft({
      ...voteDraft,
      options: voteDraft.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    });
  }

  function addVoteOption() {
    if (!voteDraft || voteDraft.options.length >= 12) return;
    applyVoteDraft({
      ...voteDraft,
      options: [
        ...voteDraft.options,
        `选项 ${voteDraft.options.length + 1}`
      ]
    });
  }

  function removeVoteOption(index: number) {
    if (!voteDraft || voteDraft.options.length <= 2) return;
    applyVoteDraft({
      ...voteDraft,
      options: voteDraft.options.filter(
        (_option, optionIndex) => optionIndex !== index
      )
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

      insertText(form.contentUbb, insertionPoint);
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

  const canPostToTarget = Boolean(
    targetForum && Number(targetForum.notopic) !== 1
  );
  const voteIsValid =
    !voteDraft ||
    (Boolean(voteDraft.question.trim()) &&
      voteDraft.question.trim().length <= 120 &&
      voteDraft.options.length >= 2 &&
      voteDraft.options.every(
        (option) => Boolean(option.trim()) && option.trim().length <= 120
      ) &&
      new Set(
        voteDraft.options.map((option) =>
          option.trim().toLocaleLowerCase("zh-CN")
        )
      ).size === voteDraft.options.length);
  const canSubmit =
    canPostToTarget &&
    Boolean(title.trim()) &&
    Boolean(content.trim()) &&
    voteIsValid;

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
      </div>
      <input
        className="composer-title"
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="标题"
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
              className={voteDraft ? "active" : ""}
              type="button"
              onClick={toggleVoteDraft}
              aria-label={voteDraft ? "移除投票" : "插入投票"}
              title={voteDraft ? "移除投票" : "插入投票"}
              aria-pressed={Boolean(voteDraft)}
            >
              <Vote size={16} />
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
              onSelect={(face) => insertInlineText(`{${face.name}}`)}
            />
            <input
              ref={fileInputRef}
              className="attachment-input"
              type="file"
              multiple
              onChange={selectAttachments}
            />
          </div>
        )}
        {mode === "write" && voteDraft ? (
          <section className="vote-draft-editor">
            <div className="vote-draft-heading">
              <div>
                <strong>设置投票</strong>
              </div>
            </div>
            <label className="vote-draft-deadline">
              <span>截止时间（可选，北京时间）</span>
              <input
                type="datetime-local"
                value={voteDraft.until}
                onChange={(event) =>
                  applyVoteDraft({
                    ...voteDraft,
                    until: event.target.value
                  })
                }
                aria-label="投票截止时间"
              />
            </label>
            <input
              className="vote-draft-question"
              value={voteDraft.question}
              onChange={(event) =>
                applyVoteDraft({
                  ...voteDraft,
                  question: event.target.value
                })
              }
              placeholder="投票题目"
              maxLength={120}
              aria-label="投票题目"
            />
            <div className="vote-draft-options">
              {voteDraft.options.map((option, index) => (
                <div className="vote-draft-option" key={index}>
                  <span>{index + 1}</span>
                  <input
                    value={option}
                    onChange={(event) =>
                      updateVoteOption(index, event.target.value)
                    }
                    placeholder={`选项 ${index + 1}`}
                    maxLength={120}
                    aria-label={`投票选项 ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeVoteOption(index)}
                    disabled={voteDraft.options.length <= 2}
                    aria-label={`删除选项 ${index + 1}`}
                    title="删除选项"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="vote-draft-add"
              type="button"
              onClick={addVoteOption}
              disabled={voteDraft.options.length >= 12}
            >
              <Plus size={15} /> 添加选项
            </button>
          </section>
        ) : null}
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
        )}
        {mode === "write" ? (
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
            placeholder="描述背景、已经尝试过的方案，以及你真正想讨论的问题……"
          />
        ) : (
          <div className="composer-preview" data-math-content>
            <ComposerPreview content={content} faces={faces} />
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
          <span className="draft-state">
            {saved ? "草稿已保存" : "草稿仅保存在本机"}
          </span>
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
