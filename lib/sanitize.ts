import sanitizeHtml from "sanitize-html";

function resolveHref(value = "") {
  const topicMatch = value.match(/(?:^|\/)bbs\.topic\.(\d+)\.(?:json|html)/);
  if (topicMatch) return `/topic/${topicMatch[1]}`;

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
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          href: resolveHref(attribs.href),
          target: "_blank",
          rel: "noopener noreferrer"
        }
      }),
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
