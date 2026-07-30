const blockedStylePropertyPattern =
  /^(?:position|behavior|binding|-moz-binding)$/i;
const blockedStyleValuePattern =
  /(?:expression\s*\(|javascript:|@import|url\s*\(\s*["']?\s*javascript:)/i;

export function hasUserCssClass(className?: string) {
  return className?.split(/\s+/).includes("usercss") ?? false;
}

export function isUserHtmlIframe(attribs: Record<string, string>) {
  return (
    hasUserCssClass(attribs.class) ||
    attribs.class?.split(/\s+/).includes("useriframe") === true
  ) && Boolean(attribs.srcdoc?.trim());
}

export function sanitizeUserStyle(style?: string) {
  if (!style?.trim()) return "";

  return style
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator < 1) return false;

      const property = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();
      if (!property || !value) return false;
      if (blockedStylePropertyPattern.test(property)) return false;
      if (blockedStyleValuePattern.test(declaration)) return false;
      return true;
    })
    .join("; ");
}

export function clampIframeDimension(value?: string) {
  if (!value) return undefined;

  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric > 8192) {
    return "8192";
  }

  return value;
}
