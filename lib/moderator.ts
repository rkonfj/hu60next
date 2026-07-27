import { getUserProfile } from "@/lib/hu60";

const MODERATOR_PERMISSION = "PERMISSION_REVIEW_POST";
const MODERATOR_CACHE_SECONDS = 600;

type ModeratorCacheEntry = {
  expiresAt: number;
  value: boolean;
};

const moderatorMemoryCache = new Map<number, ModeratorCacheEntry>();
const moderatorRequests = new Map<number, Promise<boolean>>();

export function hasModeratorPermission(permissions?: string[] | null) {
  return permissions?.includes(MODERATOR_PERMISSION) === true;
}

export async function isModerator(uid?: number | null) {
  const safeUid = Math.trunc(Number(uid));
  if (!Number.isFinite(safeUid) || safeUid <= 0) return false;

  const now = Date.now();
  const cached = moderatorMemoryCache.get(safeUid);
  if (cached && cached.expiresAt > now) return cached.value;

  const existingRequest = moderatorRequests.get(safeUid);
  if (existingRequest) return existingRequest;

  const request = getUserProfile(safeUid)
    .then((profile) => {
      const value =
        !profile.__fallback && hasModeratorPermission(profile.permissions);
      moderatorMemoryCache.set(safeUid, {
        expiresAt: Date.now() + MODERATOR_CACHE_SECONDS * 1000,
        value
      });
      return value;
    })
    .catch(() => false)
    .finally(() => {
      moderatorRequests.delete(safeUid);
    });

  moderatorRequests.set(safeUid, request);
  return request;
}

