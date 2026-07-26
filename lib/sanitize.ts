import sanitizeHtml from "sanitize-html";
import { highlightCode } from "@/lib/highlight";
import {
  resolveSafeMediaUrl,
  resolveTrustedEmbedUrl
} from "@/lib/media";

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

      return `<pre class="syntax-highlight"${languageLabel}><button class="code-copy-button" type="button" data-copy-code aria-label="复制代码">复制</button><code class="hljs${languageClass}">${highlighted.html}</code></pre>`;
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

export function sanitizeHu60Content(content: string) {
  const sanitized = sanitizeHtml(content, {
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
      a: ["href", "title", "class"],
      audio: [
        "src",
        "class",
        "controls",
        "preload",
        "poster"
      ],
      img: ["src", "alt", "title", "class", "width", "height"],
      iframe: [
        "src",
        "title",
        "class",
        "allow",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
        "sandbox",
        "width",
        "height"
      ],
      code: ["class"],
      div: ["class"],
      span: ["class"],
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
        "hu60-system-notice",
        "info-box",
        "tp",
        "userblocked",
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
        /^(?:language|lang)-[a-z0-9_+#.-]+$/i
      ]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tagName, attribs) => {
        const href = resolveHref(attribs.href);
        const internal = href.startsWith("/");
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            href,
            ...(internal
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })
          }
        };
      },
      img: (_tagName, attribs) => {
        const src = resolveSource(attribs.src);
        const className = normalizeImageClass(attribs.class, src);
        return {
          tagName: "img",
          attribs: {
            ...attribs,
            src,
            ...(className ? { class: className } : {}),
            loading: "lazy",
            decoding: "async"
          }
        };
      },
      iframe: (_tagName, attribs) => {
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
            allow:
              "autoplay; encrypted-media; fullscreen; picture-in-picture",
            allowfullscreen: "",
            referrerpolicy: "strict-origin-when-cross-origin",
            sandbox:
              "allow-scripts allow-forms allow-same-origin allow-popups allow-presentation"
          }
        };
      },
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
      div: (_tagName, attribs) => {
        const className = normalizeDivClass(attribs.class);
        return {
          tagName: "div",
          attribs: {
            ...attribs,
            ...(className ? { class: className } : {})
          }
        };
      }
    },
    exclusiveFilter: (frame) =>
      (frame.tag === "iframe" &&
        !resolveTrustedEmbedUrl(frame.attribs.src)) ||
      (frame.tag === "audio" && !resolveSafeMediaUrl(frame.attribs.src)) ||
      (frame.tag === "video" && !resolveSafeMediaUrl(frame.attribs.src))
  });

  return highlightCodeBlocks(sanitized);
}
