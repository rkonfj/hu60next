export type CacheStatus = {
  key: string;
  label: string;
  description: string;
  ttlMs: number;
  lastUpdatedAt: number | null;
  expiresAt: number | null;
  state: "empty" | "fresh" | "expired" | "building";
  entryCount?: number;
  targetUid?: number;
};

export type UpstreamRequestLog = {
  method: string;
  url: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: number | null;
  ok: boolean;
  error?: string;
};

export type CacheRefreshHistory = {
  id: string;
  cacheKey: string;
  cacheLabel: string;
  actorUid: number;
  startedAt: number;
  finishedAt: number;
  ok: boolean;
  message: string;
  requests: UpstreamRequestLog[];
};

export type CacheDashboardData = {
  caches: CacheStatus[];
  history: CacheRefreshHistory[];
};
