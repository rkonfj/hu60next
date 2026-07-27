import { AsyncLocalStorage } from "node:async_hooks";
import type { UpstreamRequestLog } from "@/lib/cache-types";

type PendingRequestLog = Omit<
  UpstreamRequestLog,
  "finishedAt" | "durationMs" | "status" | "ok"
> & {
  finishedAt?: number;
  durationMs?: number;
  status?: number | null;
  ok?: boolean;
};

const requestLogStorage = new AsyncLocalStorage<PendingRequestLog[]>();

export async function withUpstreamRequestLog<T>(
  task: () => Promise<T>
): Promise<{ result: T; requests: UpstreamRequestLog[] }> {
  const entries: PendingRequestLog[] = [];
  const result = await requestLogStorage.run(entries, task);
  return {
    result,
    requests: entries.map((entry) => ({
      method: entry.method,
      url: entry.url,
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt ?? Date.now(),
      durationMs:
        entry.durationMs ?? Math.max(0, Date.now() - entry.startedAt),
      status: entry.status ?? null,
      ok: entry.ok ?? false,
      ...(entry.error ? { error: entry.error } : {})
    }))
  };
}

export function beginUpstreamRequest(method: string, url: string) {
  const entries = requestLogStorage.getStore();
  if (!entries) {
    return (_status: number | null, _error?: unknown) => {};
  }

  const entry: PendingRequestLog = {
    method,
    url,
    startedAt: Date.now()
  };
  entries.push(entry);

  return (status: number | null, error?: unknown) => {
    entry.finishedAt = Date.now();
    entry.durationMs = entry.finishedAt - entry.startedAt;
    entry.status = status;
    entry.ok = status !== null && status >= 200 && status < 300 && !error;
    if (error) {
      entry.error =
        error instanceof Error ? error.message : String(error);
    }
  };
}
