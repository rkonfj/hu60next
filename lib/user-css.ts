const ALLOWED_STYLE_PROPERTIES = new Set([
  "background-color",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "color",
  "display",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-indent",
  "vertical-align",
  "white-space",
  "width",
  "word-break",
  "word-wrap"
]);

const DISPLAY_KEYWORDS = new Set(["inline", "inline-block", "block"]);
const FONT_STYLE_KEYWORDS = new Set(["normal", "italic", "oblique"]);
const FONT_WEIGHT_KEYWORDS = new Set([
  "normal",
  "bold",
  "bolder",
  "lighter"
]);
const TEXT_ALIGN_KEYWORDS = new Set([
  "left",
  "right",
  "center",
  "justify",
  "start",
  "end"
]);
const TEXT_DECORATION_KEYWORDS = new Set([
  "none",
  "underline",
  "overline",
  "line-through"
]);
const BORDER_STYLE_KEYWORDS = new Set([
  "none",
  "hidden",
  "solid",
  "dashed",
  "dotted",
  "double"
]);
const WHITE_SPACE_KEYWORDS = new Set([
  "normal",
  "nowrap",
  "pre",
  "pre-wrap",
  "pre-line"
]);
const WORD_BREAK_KEYWORDS = new Set([
  "normal",
  "break-all",
  "keep-all",
  "break-word"
]);
const VERTICAL_ALIGN_KEYWORDS = new Set([
  "baseline",
  "top",
  "middle",
  "bottom",
  "text-top",
  "text-bottom"
]);
const FONT_SIZE_KEYWORDS = new Set([
  "xx-small",
  "x-small",
  "small",
  "medium",
  "large",
  "x-large",
  "xx-large",
  "smaller",
  "larger"
]);

const IMAGE_STYLE_PROPERTIES = new Set([
  "height",
  "max-height",
  "max-width",
  "width"
]);

const UNSAFE_VALUE_PATTERN =
  /(?:url\s*\(|@import|expression\s*\(|javascript:)/i;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR_PATTERN =
  /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%\s,+-]+\)$/i;
const NAMED_COLOR_PATTERN = /^[a-z]+$/i;
const LENGTH_PATTERN = /^-?(?:\d+(?:\.\d+)?)(px|em|rem|%)$/i;
const UNITLESS_PATTERN = /^-?(?:\d+(?:\.\d+)?)$/;
const FONT_FAMILY_PATTERN = /^[\w "'\-,\u4e00-\u9fff]+$/u;
const BORDER_SHORTHAND_PATTERN =
  /^(?:none|\d+(?:\.\d+)?px\s+(?:solid|dashed|dotted|double)(?:\s+(?:#[0-9a-f]{3,8}|transparent|[a-z]+))?)$/i;

function parseLengthLimit(property: string, maxPx: number) {
  if (
    property === "line-height" ||
    property === "font-weight" ||
    property === "border-width" ||
    property.endsWith("-width")
  ) {
    return maxPx;
  }
  if (property.startsWith("font-")) return 200;
  if (property.includes("radius")) return 256;
  return maxPx;
}

function isSafeColor(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent" || normalized === "inherit") return true;
  return (
    HEX_COLOR_PATTERN.test(normalized) ||
    FUNCTION_COLOR_PATTERN.test(normalized) ||
    NAMED_COLOR_PATTERN.test(normalized)
  );
}

function isSafeLength(value: string, maxPx: number) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(LENGTH_PATTERN);
  if (!match) return false;

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return false;

  const unit = match[1];
  if (unit === "%") return amount >= 0 && amount <= 100;
  if (unit === "px") return amount >= 0 && amount <= maxPx;
  if (unit === "em" || unit === "rem") return amount >= 0 && amount <= 32;
  return false;
}

function isSafeLineHeight(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    isSafeLength(normalized, 8) ||
    (UNITLESS_PATTERN.test(normalized) &&
      Number.parseFloat(normalized) >= 0 &&
      Number.parseFloat(normalized) <= 8)
  );
}

function isSafeFontWeight(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    FONT_WEIGHT_KEYWORDS.has(normalized) ||
    (/^\d{3}$/.test(normalized) &&
      Number(normalized) >= 100 &&
      Number(normalized) <= 900 &&
      Number(normalized) % 100 === 0)
  );
}

function isAllowedStyleValue(property: string, value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue || UNSAFE_VALUE_PATTERN.test(normalizedValue)) {
    return false;
  }

  const limit = parseLengthLimit(property, 8192);

  switch (property) {
    case "color":
    case "background-color":
    case "border-color":
    case "border-top-color":
    case "border-right-color":
    case "border-bottom-color":
    case "border-left-color":
      return isSafeColor(normalizedValue);
    case "display":
      return DISPLAY_KEYWORDS.has(normalizedValue.toLowerCase());
    case "font-style":
      return FONT_STYLE_KEYWORDS.has(normalizedValue.toLowerCase());
    case "font-weight":
      return isSafeFontWeight(normalizedValue);
    case "font-size":
      return (
        FONT_SIZE_KEYWORDS.has(normalizedValue.toLowerCase()) ||
        isSafeLength(normalizedValue, 200)
      );
    case "font-family":
      return FONT_FAMILY_PATTERN.test(normalizedValue);
    case "text-align":
      return TEXT_ALIGN_KEYWORDS.has(normalizedValue.toLowerCase());
    case "text-decoration":
      return TEXT_DECORATION_KEYWORDS.has(normalizedValue.toLowerCase());
    case "white-space":
      return WHITE_SPACE_KEYWORDS.has(normalizedValue.toLowerCase());
    case "word-break":
    case "word-wrap":
      return WORD_BREAK_KEYWORDS.has(normalizedValue.toLowerCase());
    case "vertical-align":
      return (
        VERTICAL_ALIGN_KEYWORDS.has(normalizedValue.toLowerCase()) ||
        isSafeLength(normalizedValue, 128)
      );
    case "line-height":
      return isSafeLineHeight(normalizedValue);
    case "border-style":
    case "border-top-style":
    case "border-right-style":
    case "border-bottom-style":
    case "border-left-style":
      return BORDER_STYLE_KEYWORDS.has(normalizedValue.toLowerCase());
    case "border":
      return (
        normalizedValue.toLowerCase() === "none" ||
        BORDER_SHORTHAND_PATTERN.test(normalizedValue)
      );
    case "border-top":
    case "border-right":
    case "border-bottom":
    case "border-left":
      return BORDER_SHORTHAND_PATTERN.test(normalizedValue);
    case "text-indent":
    case "margin":
    case "margin-top":
    case "margin-right":
    case "margin-bottom":
    case "margin-left":
    case "padding":
    case "padding-top":
    case "padding-right":
    case "padding-bottom":
    case "padding-left":
    case "width":
    case "height":
    case "max-width":
    case "max-height":
    case "min-width":
    case "min-height":
    case "border-width":
    case "border-top-width":
    case "border-right-width":
    case "border-bottom-width":
    case "border-left-width":
    case "border-radius":
      return isSafeLength(normalizedValue, limit);
    default:
      return false;
  }
}

function sanitizeStyleDeclarations(
  style: string | undefined,
  allowedProperties: Set<string>
) {
  if (!style?.trim()) return "";

  return style
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator < 1) return false;

      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (!allowedProperties.has(property)) return false;
      return isAllowedStyleValue(property, value);
    })
    .join("; ");
}

export function hasUserCssClass(className?: string) {
  return className?.split(/\s+/).includes("usercss") ?? false;
}

export function isUserHtmlIframe(attribs: Record<string, string>) {
  return (
    (hasUserCssClass(attribs.class) ||
      attribs.class?.split(/\s+/).includes("useriframe") === true) &&
    Boolean(attribs.srcdoc?.trim())
  );
}

export function sanitizeUserStyle(style?: string) {
  return sanitizeStyleDeclarations(style, ALLOWED_STYLE_PROPERTIES);
}

export function sanitizeImageStyle(style?: string) {
  return sanitizeStyleDeclarations(style, IMAGE_STYLE_PROPERTIES);
}

export function mergeSanitizedStyle(
  attribs: Record<string, string>,
  style: string
) {
  const { style: _style, ...rest } = attribs;
  return style ? { ...rest, style } : rest;
}

export function clampIframeDimension(value?: string) {
  if (!value) return undefined;

  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric > 8192) {
    return "8192";
  }

  return value;
}
