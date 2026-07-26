const RESERVED_HEADERS = new Set([
  "x-sid",
  "x-origin",
  "x-real-ip",
  "x-client-ip",
  "x-cluster-client-ip",
  "x-matched-path"
]);

const BLOCKED_PREFIXES = [
  "x-forwarded-",
  "x-envoy-",
  "x-vercel-",
  "x-now-",
  "x-nextjs-",
  "x-middleware-",
  "x-invoke-",
  "x-original-",
  "x-openai-",
  "x-codex-"
];

export function isForwardableHu60Header(name: string) {
  const normalized = name.toLowerCase();
  return (
    normalized.startsWith("x-") &&
    !RESERVED_HEADERS.has(normalized) &&
    !BLOCKED_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

export function createHu60UpstreamHeaders(
  incoming: Headers,
  base?: HeadersInit
) {
  const headers = new Headers(base);
  let forwardedCustomHeaders = false;

  for (const [name, value] of incoming.entries()) {
    if (!isForwardableHu60Header(name)) continue;
    headers.set(name, value);
    forwardedCustomHeaders = true;
  }

  return { headers, forwardedCustomHeaders };
}

export function hasForwardableHu60Headers(incoming: Headers) {
  for (const name of incoming.keys()) {
    if (isForwardableHu60Header(name)) return true;
  }
  return false;
}
