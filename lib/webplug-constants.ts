export const WEBPLUG_MAX_BYTES = 60_000;

export function validateWebPlugContent(content: string) {
  const bytes = new TextEncoder().encode(content).length;
  if (!content.trim()) {
    return "插件内容不能为空。";
  }
  if (bytes > WEBPLUG_MAX_BYTES) {
    return `插件内容不能超过 ${WEBPLUG_MAX_BYTES} 字节。`;
  }
  return null;
}
