export function compactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

export function relativeTime(timestamp: number, now?: number) {
  const current = now ?? Math.floor(Date.now() / 1000);
  const diff = timestamp - current;
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });

  if (abs < 60) return "刚刚";
  if (abs < 3600) return formatter.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return formatter.format(Math.round(diff / 86400), "day");

  return new Intl.DateTimeFormat("zh-CN", {
    year: current - timestamp > 86400 * 330 ? "numeric" : undefined,
    month: "short",
    day: "numeric"
  }).format(new Date(timestamp * 1000));
}

export function fullDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai"
  }).format(new Date(timestamp * 1000));
}

export function cleanSummary(value?: string | null) {
  if (!value) return "打开帖子查看完整内容与社区讨论。";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, "链接")
    .replace(/[`#>*_[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
