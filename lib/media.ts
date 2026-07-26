const trustedPlayers: Record<string, RegExp> = {
  "player.bilibili.com": /^\/player\.html$/i,
  "player.youku.com": /^\/embed\//i,
  "v.qq.com": /^\/txp\/iframe\/player\.html$/i,
  "kg.qq.com": /^\/node\/play$/i,
  "music.163.com": /^\/outchain\/player$/i
};

export function resolveTrustedEmbedUrl(value = "") {
  try {
    const url = new URL(
      value.startsWith("//") ? `https:${value}` : value
    );
    const pathPattern = trustedPlayers[url.hostname.toLowerCase()];
    if (!pathPattern || !pathPattern.test(url.pathname)) return null;

    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveSafeMediaUrl(value = "") {
  try {
    const resolved = value.startsWith("/")
      ? new URL(value, "https://hu60.cn")
      : new URL(value.startsWith("//") ? `https:${value}` : value);
    if (!["http:", "https:"].includes(resolved.protocol)) return null;
    if (resolved.protocol === "http:") resolved.protocol = "https:";
    return resolved.toString();
  } catch {
    return null;
  }
}

export function resolveUbbVideoEmbedUrl(value = "") {
  const existingEmbed = resolveTrustedEmbedUrl(value);
  if (existingEmbed) return existingEmbed;

  const safeUrl = resolveSafeMediaUrl(value);
  if (!safeUrl) return null;

  const url = new URL(safeUrl);
  const host = url.hostname.toLowerCase();
  const source = `${url.pathname}${url.search}`;

  if (host === "b23.tv" || host.endsWith(".bilibili.com")) {
    const bvid = source.match(/\b(BV[\w]+)/i)?.[1];
    const aid = source.match(/\bav(\d+)/i)?.[1];
    const page = url.searchParams.get("p") || "1";
    if (bvid) {
      return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=${encodeURIComponent(page)}`;
    }
    if (aid) {
      return `https://player.bilibili.com/player.html?aid=${encodeURIComponent(aid)}&page=${encodeURIComponent(page)}`;
    }
  }

  if (host.endsWith(".youku.com")) {
    const videoId = source.match(/\/id_([a-z0-9=]+)/i)?.[1];
    if (videoId) {
      return `https://player.youku.com/embed/${encodeURIComponent(videoId)}`;
    }
  }

  if (host.endsWith(".qq.com")) {
    const videoId = url.pathname.match(/\/([a-z0-9=]+)(?:\.html)?$/i)?.[1];
    if (videoId) {
      return `https://v.qq.com/txp/iframe/player.html?vid=${encodeURIComponent(videoId)}`;
    }
  }

  return null;
}
