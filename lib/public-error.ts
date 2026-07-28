const MAX_PUBLIC_ERROR_LENGTH = 800;

export type PublicErrorDetails = {
  name: string;
  message: string;
};

function redactUrls(value: string) {
  return value.replace(/\bhttps?:\/\/[^\s<>"']+/gi, (match) => {
    try {
      const url = new URL(match);
      return `${url.origin}${url.pathname}${
        url.search || url.hash ? "?[参数已隐藏]" : ""
      }`;
    } catch {
      return "[链接已隐藏]";
    }
  });
}

export function redactPublicErrorMessage(value: string) {
  const redacted = redactUrls(value)
    .replace(
      /\b(Bearer|Basic)\s+[a-z0-9._~+/=-]+/gi,
      "$1 [凭据已隐藏]"
    )
    .replace(
      /\b(authorization|cookie|set-cookie|x-sid|sid|session|token|password|passwd|secret|api[-_]?key)\b(\s*[:=]\s*)([^,\s;]+)/gi,
      "$1$2[值已隐藏]"
    )
    .replace(
      /(?:\/(?:home|Users|root|tmp|var|etc)\/)[^\s:),]+/g,
      "[本机路径已隐藏]"
    )
    .replace(
      /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
      "[邮箱已隐藏]"
    )
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();

  if (!redacted) return "未提供错误消息";
  if (redacted.length <= MAX_PUBLIC_ERROR_LENGTH) return redacted;
  return `${redacted.slice(0, MAX_PUBLIC_ERROR_LENGTH)}…`;
}

export function getPublicErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: redactPublicErrorMessage(error.name || "Error"),
      message: redactPublicErrorMessage(error.message)
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: redactPublicErrorMessage(error)
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    "message" in error &&
    typeof error.name === "string" &&
    typeof error.message === "string"
  ) {
    return {
      name: redactPublicErrorMessage(error.name || "Error"),
      message: redactPublicErrorMessage(error.message)
    };
  }

  return {
    name: "Error",
    message: "服务端抛出了无法安全显示的非标准错误"
  };
}
