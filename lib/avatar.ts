export function avatarUrl(value?: string | null) {
  if (!value || value === "/upload/default.jpg") return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://hu60.cn${value}`;
  return value.replace("http://", "https://");
}
