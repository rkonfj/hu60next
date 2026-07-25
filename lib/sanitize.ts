import sanitizeHtml from "sanitize-html";

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

export function sanitizeHu60Content(content: string) {
  return sanitizeHtml(content, {
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
        "userlink",
        "userimg",
        "userinfo",
        "userat",
        "hu60_code"
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
      img: (_tagName, attribs) => ({
        tagName: "img",
        attribs: {
          ...attribs,
          src: resolveSource(attribs.src),
          loading: "lazy",
          decoding: "async"
        }
      })
    }
  });
}
