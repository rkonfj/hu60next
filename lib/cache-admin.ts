import type {
  CacheDashboardData,
  CacheRefreshHistory
} from "@/lib/cache-types";
import {
  getHu60CacheStatuses,
  getUserProfile,
  refreshHu60Cache
} from "@/lib/hu60";
import {
  getWeeklyCacheStatuses,
  refreshPersonalWeeklyReportCache,
  refreshWeeklyCache
} from "@/lib/weekly-report";
import { withUpstreamRequestLog } from "@/lib/upstream-request-log";

const refreshHistory: CacheRefreshHistory[] = [];
const refreshPromises = new Map<string, Promise<CacheRefreshHistory>>();
const HU60_CACHE_KEYS = new Set([
  "faces",
  "daily-forum-topics",
  "honor-roll"
]);

function isPersonalWeeklyReportKey(key: string) {
  return key === "personal-weekly-report" ||
    key.startsWith("personal-weekly-report:");
}

export function getCacheDashboardData(): CacheDashboardData {
  return {
    caches: [
      ...getHu60CacheStatuses(),
      ...getWeeklyCacheStatuses()
    ].filter((cache) => !isPersonalWeeklyReportKey(cache.key)),
    history: refreshHistory
      .filter((entry) => !isPersonalWeeklyReportKey(entry.cacheKey))
      .slice(0, 30),
    visitors: []
  };
}

async function runCacheRefresh(
  cacheKey: string,
  actorUid: number,
  targetUid?: number
): Promise<CacheRefreshHistory> {
  const personalUid =
    cacheKey === "personal-weekly-report"
      ? Number(targetUid)
      : cacheKey.startsWith("personal-weekly-report:")
        ? Number(cacheKey.split(":")[1])
        : 0;
  const isPersonalReport =
    Number.isInteger(personalUid) && personalUid > 0;
  const cache = isPersonalReport
    ? {
        key: `personal-weekly-report:${personalUid}`,
        label: `个人足迹 #${personalUid}`
      }
    : getCacheDashboardData().caches.find(
        (item) => item.key === cacheKey
      );
  if (!cache) throw new Error("未知的缓存项目");

  const startedAt = Date.now();
  const { result, requests } = await withUpstreamRequestLog(async () => {
    try {
      if (isPersonalReport) {
        const profile = await getUserProfile(personalUid);
        if (profile.__fallback) {
          throw new Error(`无法读取用户 #${personalUid}`);
        }
        const username =
          profile.name || profile._u_name || `用户 ${personalUid}`;
        await refreshPersonalWeeklyReportCache(personalUid, username);
      } else if (HU60_CACHE_KEYS.has(cacheKey)) {
        await refreshHu60Cache(cacheKey);
      } else {
        await refreshWeeklyCache(cacheKey);
      }
      return { ok: true, message: "刷新成功" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "刷新失败"
      };
    }
  });

  const history: CacheRefreshHistory = {
    id: crypto.randomUUID(),
    cacheKey: cache.key,
    cacheLabel: cache.label,
    actorUid,
    startedAt,
    finishedAt: Date.now(),
    ok: result.ok,
    message: result.message,
    requests
  };
  refreshHistory.unshift(history);
  refreshHistory.splice(30);
  return history;
}

export async function refreshCache(
  cacheKey: string,
  actorUid: number,
  targetUid?: number
): Promise<CacheRefreshHistory> {
  const refreshKey =
    cacheKey === "personal-weekly-report"
      ? `${cacheKey}:${Number(targetUid)}`
      : cacheKey;
  const active = refreshPromises.get(refreshKey);
  if (active) return active;

  const promise = runCacheRefresh(cacheKey, actorUid, targetUid);
  refreshPromises.set(refreshKey, promise);
  try {
    return await promise;
  } finally {
    refreshPromises.delete(refreshKey);
  }
}
