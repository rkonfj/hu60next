const markdownSourcePattern = /^\s*<!--\s*markdown\s*-->/i;
const markdownBodyPattern =
  /\bclass\s*=\s*(?:"[^"]*\bmarkdown-body\b[^"]*"|'[^']*\bmarkdown-body\b[^']*')/i;

export function isHu60MarkdownContent(content: string) {
  return (
    markdownSourcePattern.test(content) ||
    markdownBodyPattern.test(content)
  );
}
