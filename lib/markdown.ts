const markdownSourcePattern = /^\s*<!--\s*markdown\s*-->/i;
const markdownBodyPattern =
  /\bclass\s*=\s*(?:"[^"]*\bmarkdown-body\b[^"]*"|'[^']*\bmarkdown-body\b[^']*')/i;
const markdownMarker = "<!--markdown -->";

export function withHu60MarkdownMarker(content: string) {
  const normalizedContent = content.trim();

  return markdownSourcePattern.test(normalizedContent)
    ? normalizedContent
    : `${markdownMarker}\n${normalizedContent}`;
}

export function isHu60MarkdownContent(content: string) {
  return (
    markdownSourcePattern.test(content) ||
    markdownBodyPattern.test(content)
  );
}
