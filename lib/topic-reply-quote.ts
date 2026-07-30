export function formatReplyQuote(
  author: string,
  floor: number,
  quotedContent: string
) {
  const header = `@${author}${floor > 0 ? ` #${floor}` : ""}`;
  const body = quotedContent.trimEnd();
  if (!body) return `${header} `;
  return `${header}\n\n${body}\n\n`;
}
