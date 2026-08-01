import sanitizeHtml, { type Attributes, type Tag } from "sanitize-html";
import { highlightCode } from "@/lib/highlight";
import {
  resolveSafeMediaUrl,
  resolveTrustedEmbedUrl
} from "@/lib/media";
import {
  clampIframeDimension,
  hasUserCssClass,
  isUserHtmlIframe,
  mergeSanitizedStyle,
  sanitizeImageStyle,
  sanitizeUserStyle
} from "@/lib/user-css";

function sanitizeUserHtmlSrcdoc(srcdoc: string) {
  const decoded = decodeCodeEntities(srcdoc);
  return sanitizeHtml(decoded, {
    allowedTags: [
      "a",
      "b",
      "br",
      "code",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul"
    ],
    allowedAttributes: {
      a: ["href", "title", "class"],
      div: ["class", "style"],
      img: ["src", "alt", "title", "class", "style", "width", "height"],
      p: ["class"],
      span: ["class", "style"]
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    parseStyleAttributes: false,
    transformTags: {
      div: (_tagName, attribs) => ({
        tagName: "div",
        attribs: mergeSanitizedStyle(
          attribs,
          sanitizeUserStyle(attribs.style)
        )
      }),
      span: (_tagName, attribs) => ({
        tagName: "span",
        attribs: mergeSanitizedStyle(
          attribs,
          sanitizeUserStyle(attribs.style)
        )
      }),
      img: (_tagName, attribs) => ({
        tagName: "img",
        attribs: {
          ...attribs,
          src: resolveSource(attribs.src)
        }
      }),
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          href: resolveHref(attribs.href),
          target: "_blank",
          rel: "noopener noreferrer"
        }
      })
    }
  });
}

function normalizeUserCssAttribs(attribs: Record<string, string>) {
  if (!hasUserCssClass(attribs.class)) {
    const { style: _style, ...rest } = attribs;
    return rest;
  }

  const style = sanitizeUserStyle(attribs.style);
  return mergeSanitizedStyle(attribs, style);
}

function decodeCodeEntities(value: string) {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos);/gi,
    (entity, decimal, hexadecimal) => {
      if (decimal || hexadecimal) {
        const codePoint = decimal
          ? Number(decimal)
          : Number.parseInt(hexadecimal, 16);
        return Number.isInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }

      const named: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'"
      };
      return named[entity.toLowerCase()] || entity;
    }
  );
}

function attributeValue(attributes: string, name: string) {
  return attributes.match(
    new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i")
  )?.slice(1).find(Boolean);
}

function highlightCodeBlocks(content: string) {
  return content.replace(
    /<pre([^>]*)>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, preAttributes, codeAttributes, innerContent) => {
      const classes = [
        attributeValue(preAttributes, "class"),
        attributeValue(codeAttributes, "class")
      ]
        .filter(Boolean)
        .join(" ");
      const requestedLanguage = classes.match(
        /(?:language|lang)-([a-z0-9_+#.-]+)/i
      )?.[1] ||
        classes
          .split(/\s+/)
          .find((className) => !/^(?:hu60_code|hljs)$/i.test(className));
      const code = decodeCodeEntities(
        innerContent.replace(/<[^>]*>/g, "")
      );
      const highlighted = highlightCode(code, requestedLanguage);
      const languageClass = highlighted.language
        ? ` language-${highlighted.language}`
        : "";
      const languageLabel = highlighted.language
        ? ` data-language="${highlighted.language}"`
        : "";

      return `<div class="code-block-shell"${languageLabel}><button class="code-copy-button" type="button" data-copy-code aria-label="复制代码"><svg class="code-copy-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg><svg class="code-copy-success-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg></button><pre class="syntax-highlight"><code class="hljs${languageClass}">${highlighted.html}</code></pre></div>`;
    }
  );
}

function resolveHref(value = "") {
  const topicMatch = value.match(/(?:^|\/)bbs\.topic\.(\d+)\.(?:json|html)/);
  if (topicMatch) return `/topic/${topicMatch[1]}`;

  const forumMatch = value.match(/(?:^|\/)bbs\.forum\.(\d+)(?:\.\d+)*\.(?:json|html)/);
  if (forumMatch) return `/forum/${forumMatch[1]}`;

  const userMatch = value.match(/(?:^|\/)user\.info\.(\d+)\.(?:json|html)/);
  if (userMatch) return `/user/${userMatch[1]}`;

  if (/(?:^|\/)bbs\.newtopic(?:\.\d+)?\.(?:json|html)/.test(value)) {
    return "/compose";
  }
  if (/(?:^|\/)bbs\.myfavorite\.(?:json|html)/.test(value)) {
    return "/favorites";
  }
  if (/(?:^|\/)bbs\.search\.(?:json|html)/.test(value)) {
    try {
      const url = new URL(value, "https://hu60.cn/q.php/");
      const query =
        url.searchParams.get("keywords") || url.searchParams.get("q") || "";
      return query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    } catch {
      return "/search";
    }
  }
  if (/(?:^|\/)msg\.index\.inbox/.test(value)) return "/messages/inbox";
  if (/(?:^|\/)msg\.index\.outbox/.test(value)) return "/messages/sent";
  if (/(?:^|\/)msg\.index\.@/.test(value)) return "/messages/mentions";
  if (/(?:^|\/)addin\.chat\./.test(value)) return "/messages/chat";
  if (/(?:^|\/)user\.index\.(?:json|html)/.test(value)) return "/me";
  if (/(?:^|\/)user\.login\.(?:json|html)/.test(value)) return "/login";
  if (/(?:^|\/)user\.reg\.(?:json|html)/.test(value)) return "/register";
  if (/(?:^|\/)user\.reset_pwd\.(?:json|html)/.test(value)) {
    return "/forgot-password";
  }
  if (/(?:^|\/)index\.index\.(?:json|html)/.test(value)) {
    return "/explore/active";
  }

  if (value.startsWith("/")) return `https://hu60.cn${value}`;
  if (/^(bbs|user|msg|addin|index)\./.test(value)) {
    return `https://hu60.cn/q.php/${value.replace(".json", ".html")}`;
  }
  return value;
}

function resolveSource(value = "") {
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://hu60.cn${value}`;
  return value.replace(/^http:\/\//, "https://");
}

function normalizeImageClass(value = "", src = "") {
  const classes = value.split(/\s+/).filter(Boolean);
  if (
    classes.includes("hu60_face") ||
    /(?:^|\/)img\/face\//i.test(src)
  ) {
    classes.push("hu60_face");
  }
  return [...new Set(classes)].join(" ");
}

function normalizeDivClass(value = "") {
  const classes = value.split(/\s+/).filter(Boolean);
  if (
    classes.includes("info-box") ||
    classes.includes("userblocked")
  ) {
    classes.push("hu60-system-notice");
  }
  return [...new Set(classes)].join(" ");
}

function stripLeadingReviewNotice(content: string) {
  const opening = content.match(
    /<div\b[^>]*class=(?:"[^"]*\binfo-box\b[^"]*"|'[^']*\binfo-box\b[^']*')[^>]*>/i
  );
  if (!opening || opening.index === undefined || opening.index > 240) {
    return content;
  }

  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = opening.index;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(content))) {
    if (/^<div\b/i.test(match[0])) {
      depth += 1;
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return `${content.slice(0, opening.index)}${content.slice(tagPattern.lastIndex)}`
        .replace(/^\s+/, "");
    }
  }

  return content;
}

function transformIframeTag(_tagName: string, attribs: Attributes): Tag {
  if (isUserHtmlIframe(attribs)) {
    const width = clampIframeDimension(attribs.width) || "100%";
    const height = clampIframeDimension(attribs.height) || "300";
    const style = sanitizeUserStyle(attribs.style) || "border: none";
    const userAttribs: Attributes = {
      class: "useriframe hu60-user-html-frame",
      src: "",
      srcdoc: sanitizeUserHtmlSrcdoc(attribs.srcdoc || ""),
      width,
      height,
      style,
      seamless: "",
      allow: "fullscreen; local-fonts",
      sandbox:
        "allow-forms allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts",
      loading: "lazy",
      referrerpolicy: "strict-origin-when-cross-origin",
      title: attribs.title || "用户嵌入 HTML"
    };
    if (attribs.id) userAttribs.id = attribs.id;
    return { tagName: "iframe", attribs: userAttribs };
  }

  const src = resolveTrustedEmbedUrl(attribs.src);
  const isAudio =
    src?.includes("music.163.com/outchain/player") ||
    attribs.class?.split(/\s+/).includes("audio");
  return {
    tagName: "iframe",
    attribs: {
      src: src || "",
      class: isAudio ? "hu60-audio-frame" : "hu60-video-frame",
      title:
        attribs.title ||
        (isAudio ? "嵌入音频播放器" : "嵌入视频播放器"),
      loading: "lazy",
      allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
      allowfullscreen: "",
      referrerpolicy: "strict-origin-when-cross-origin",
      sandbox:
        "allow-scripts allow-forms allow-same-origin allow-popups allow-presentation"
    }
  };
}

function expandVoteUbb(content: string, currentTopicId?: number) {
  const protectedCode: string[] = [];
  const codeProtectedContent = content.replace(
    /<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (source) => {
      const index = protectedCode.push(source) - 1;
      return `\uE000HU60_CODE_${index}\uE001`;
    }
  );
  const normalizedBrackets = codeProtectedContent
    .replace(/(?:&#0*91;|&#x0*5b;|&lbrack;)/gi, "[")
    .replace(/(?:&#0*93;|&#x0*5d;|&rbrack;)/gi, "]");
  const commentsRemoved =
    Number.isSafeInteger(currentTopicId) && Number(currentTopicId) > 0
      ? normalizedBrackets
          .replace(
            /<p\b[^>]*>\s*\[comment\][\s\S]*?\[\/comment\]\s*<\/p>/gi,
            ""
          )
          .replace(/\[comment\][\s\S]*?\[\/comment\]/gi, "")
      : normalizedBrackets;
  const votePattern =
    /\[vote(?:\s+[^\]]*)?\][\s\S]*?\[\/vote\]/gi;
  let renderedVote = false;
  const placeholder = (_source: string) => {
    const topicId = Number(currentTopicId);
    if (!Number.isSafeInteger(topicId) || topicId < 1) return _source;
    if (renderedVote) return "";
    renderedVote = true;

    return `<div class="hu60-vote" data-vote-topic-id="${topicId}" role="status" aria-live="polite"><span class="hu60-vote-loading">正在载入投票…</span></div>`;
  };
  const expanded = commentsRemoved
    .replace(
      new RegExp(
        `<p\\b[^>]*>\\s*${votePattern.source}\\s*</p>`,
        "gi"
      ),
      placeholder
    )
    .replace(votePattern, placeholder);

  return expanded.replace(
    /\uE000HU60_CODE_(\d+)\uE001/g,
    (source, rawIndex: string) =>
      protectedCode[Number(rawIndex)] ?? source
  );
}

export function sanitizeHu60Content(
  content: string,
  currentTopicId?: number
) {
  const sanitized = sanitizeHtml(expandVoteUbb(content, currentTopicId), {
    allowedTags: [
      "a",
      "abbr",
      "audio",
      "b",
      "blockquote",
      "br",
      "code",
      "del",
      "details",
      "div",
      "em",
      "figcaption",
      "figure",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "hr",
      "i",
      "iframe",
      "img",
      "kbd",
      "li",
      "mark",
      "ol",
      "p",
      "pre",
      "s",
      "small",
      "span",
      "strong",
      "sub",
      "summary",
      "sup",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
      "video"
    ],
    allowedAttributes: {
      a: ["href", "title", "class", "data-member-uid"],
      audio: [
        "src",
        "class",
        "controls",
        "preload",
        "poster"
      ],
      img: [
        "src",
        "alt",
        "title",
        "class",
        "style",
        "width",
        "height"
      ],
      iframe: [
        "src",
        "srcdoc",
        "title",
        "class",
        "id",
        "allow",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
        "sandbox",
        "seamless",
        "style",
        "width",
        "height"
      ],
      code: ["class"],
      div: [
        "class",
        "style",
        "data-vote-topic-id",
        "role",
        "aria-live"
      ],
      span: ["class", "style"],
      p: ["class"],
      pre: ["class"],
      table: ["class"],
      video: [
        "src",
        "class",
        "controls",
        "preload",
        "poster",
        "playsinline"
      ]
    },
    allowedClasses: {
      "*": [
        "markdown-body",
        "hu60_face",
        "hu60-post-tail",
        "hu60-user-html-frame",
        "hu60-system-notice",
        "hu60-vote",
        "hu60-vote-loading",
        "info-box",
        "tp",
        "userblocked",
        "usercss",
        "useriframe",
        "iframe_box",
        "useriframelink",
        "userlink",
        "userimg",
        "userinfo",
        "userat",
        "hu60_code",
        "video_box",
        "video",
        "uservideosite",
        "uservideolink",
        "hu60-video-frame",
        "hu60-video-native",
        "audio_box",
        "audio",
        "useraudiosite",
        "useraudiolink",
        "hu60-audio-frame",
        "hu60-audio-native",
        "bash",
        "shell",
        "sh",
        "c",
        "cpp",
        "cxx",
        "css",
        "go",
        "java",
        "javascript",
        "js",
        "jsx",
        "json",
        "markdown",
        "md",
        "php",
        "python",
        "py",
        "rust",
        "rs",
        "sql",
        "typescript",
        "ts",
        "tsx",
        "xml",
        "html",
        "yaml",
        "yml",
        /^(?:language|lang)-[a-z0-9_+#.-]+$/i,
        /^uid-\d+$/i
      ]
    },
    parseStyleAttributes: false,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tagName, attribs) => {
        const href = resolveHref(attribs.href);
        const internal = href.startsWith("/");
        const userId = href.match(/^\/user\/(\d+)$/)?.[1];
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            href,
            ...(userId ? { "data-member-uid": userId } : {}),
            ...(internal
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })
          }
        };
      },
      img: (_tagName, attribs) => {
        const src = resolveSource(attribs.src);
        const className = normalizeImageClass(attribs.class, src);
        const style = sanitizeImageStyle(attribs.style);
        return {
          tagName: "img",
          attribs: {
            ...mergeSanitizedStyle(attribs, style),
            src,
            ...(className ? { class: className } : {}),
            loading: "lazy",
            decoding: "async"
          }
        };
      },
      iframe: transformIframeTag,
      audio: (_tagName, attribs) => {
        const src = resolveSafeMediaUrl(attribs.src);
        return {
          tagName: "audio",
          attribs: {
            src: src || "",
            class: "hu60-audio-native",
            controls: "",
            preload: "metadata"
          }
        };
      },
      video: (_tagName, attribs) => {
        const src = resolveSafeMediaUrl(attribs.src);
        return {
          tagName: "video",
          attribs: {
            src: src || "",
            class: "hu60-video-native",
            controls: "",
            playsinline: "",
            preload: "metadata",
            ...(attribs.poster
              ? { poster: resolveSafeMediaUrl(attribs.poster) || "" }
              : {})
          }
        };
      },
      span: (_tagName, attribs) => ({
        tagName: "span",
        attribs: normalizeUserCssAttribs(attribs)
      }),
      div: (_tagName, attribs) => {
        const className = normalizeDivClass(attribs.class);
        return {
          tagName: "div",
          attribs: normalizeUserCssAttribs({
            ...attribs,
            ...(className ? { class: className } : {})
          })
        };
      }
    },
    exclusiveFilter: (frame) =>
      (frame.tag === "iframe" &&
        !isUserHtmlIframe(frame.attribs) &&
        !resolveTrustedEmbedUrl(frame.attribs.src)) ||
      (frame.tag === "audio" && !resolveSafeMediaUrl(frame.attribs.src)) ||
      (frame.tag === "video" && !resolveSafeMediaUrl(frame.attribs.src))
  });

  return highlightCodeBlocks(sanitized);
}

export function sanitizeHu60ReviewContent(
  content: string,
  hasEmbeddedReviewNotice = true,
  currentTopicId?: number
) {
  return sanitizeHu60Content(
    hasEmbeddedReviewNotice
      ? stripLeadingReviewNotice(content)
      : content,
    currentTopicId
  );
}
