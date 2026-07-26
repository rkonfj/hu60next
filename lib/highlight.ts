import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const languages = {
  bash,
  c,
  cpp,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  php,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml
};

for (const [name, definition] of Object.entries(languages)) {
  hljs.registerLanguage(name, definition);
}

const aliases: Record<string, keyof typeof languages> = {
  cxx: "cpp",
  h: "c",
  hpp: "cpp",
  html: "xml",
  js: "javascript",
  jsx: "javascript",
  md: "markdown",
  py: "python",
  rs: "rust",
  shell: "bash",
  sh: "bash",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml"
};

export type HighlightedCode = {
  html: string;
  language?: string;
};

export function highlightCode(
  code: string,
  requestedLanguage?: string
): HighlightedCode {
  const requested = requestedLanguage?.trim().toLowerCase();
  const normalized = requested
    ? aliases[requested] || (requested as keyof typeof languages)
    : undefined;

  if (normalized && hljs.getLanguage(normalized)) {
    return {
      html: hljs.highlight(code, {
        language: normalized,
        ignoreIllegals: true
      }).value,
      language: normalized
    };
  }

  const result = hljs.highlightAuto(code, Object.keys(languages));
  return {
    html: result.value,
    language: result.language
  };
}
