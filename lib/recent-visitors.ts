import type { RecentVisitor } from "@/lib/cache-types";

const VISITOR_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_VISITORS = 5000;

type RecentVisitorStore = Map<number, RecentVisitor>;

const visitorStore = (() => {
  const scope = globalThis as typeof globalThis & {
    __hulvlinRecentVisitorStore?: RecentVisitorStore;
  };
  return (scope.__hulvlinRecentVisitorStore ??= new Map());
})();

function pruneVisitors(now = Date.now()) {
  const cutoff = now - VISITOR_RETENTION_MS;
  for (const [uid, visitor] of visitorStore) {
    if (visitor.lastVisitedAt < cutoff) visitorStore.delete(uid);
  }

  if (visitorStore.size <= MAX_VISITORS) return;
  const oldest = [...visitorStore.values()]
    .sort((a, b) => a.lastVisitedAt - b.lastVisitedAt)
    .slice(0, visitorStore.size - MAX_VISITORS);
  for (const visitor of oldest) visitorStore.delete(visitor.uid);
}

export function recordRecentVisitor(uid: number, name?: string | null) {
  if (!Number.isInteger(uid) || uid <= 0) return;
  const now = Date.now();
  pruneVisitors(now);
  const existing = visitorStore.get(uid);
  visitorStore.set(uid, {
    uid,
    name: name?.trim() || existing?.name || `用户 ${uid}`,
    firstVisitedAt: existing?.firstVisitedAt ?? now,
    lastVisitedAt: now,
    visitCount: (existing?.visitCount ?? 0) + 1
  });
}

export function getRecentVisitors(): RecentVisitor[] {
  pruneVisitors();
  return [...visitorStore.values()].sort(
    (a, b) => b.lastVisitedAt - a.lastVisitedAt
  );
}
