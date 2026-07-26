import sanitizeHtml from "sanitize-html";
import { highlightCode } from "@/lib/highlight";

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
      )?.[1];
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
      "ul"
    ],
    allowedAttributes: {
      a: ["href", "title", "class"],
      img: ["src", "alt", "title", "class", "width", "height"],
      code: ["class"],
      div: ["class"],
      span: ["class"],
      p: ["class"],
      pre: ["class"],
      table: ["class"]
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
    }
  });

  return highlightCodeBlocks(sanitized);
}
