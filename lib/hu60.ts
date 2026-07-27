import { cookies, headers as requestHeaders } from "next/headers";
import { cache } from "react";
import {
  fallbackForums,
  fallbackHome,
  fallbackSearch,
  fallbackTopic
} from "@/lib/fallback-data";
import type {
  AccountProfile,
  ChatResponse,
  DailyForumTopicCounts,
  EditPostFormResponse,
  FavoriteTopicsResponse,
  ForumFace,
  ForumTree,
  ForumsResponse,
  HomeResponse,
  HonorMember,
  HonorRoll,
  MessagesResponse,
  NewTopicFormResponse,
  RelationshipResponse,
  RelationshipType,
  ReviewQueueResponse,
  SearchResponse,
  Topic,
  TopicResponse,
  UserProfile,
  UserRepliesResponse,
  UserStatus
} from "@/lib/types";
import { recordRecentVisitor } from "@/lib/recent-visitors";
import { getMemberTitleByUid } from "@/lib/member";
import type { CacheStatus } from "@/lib/cache-types";
import {
  createHu60UpstreamHeaders,
  hasForwardableHu60Headers
} from "@/lib/hu60-headers";
import { TOPIC_PAGE_SIZE } from "@/lib/topic-navigation";
import { beginUpstreamRequest } from "@/lib/upstream-request-log";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";
const TOPICS_PER_PAGE = TOPIC_PAGE_SIZE;
const HONOR_TOPIC_SAMPLE_SIZE = 200;
const HONOR_TOPIC_FETCH_SIZE = 360;
const HONOR_REPLY_SAMPLE_SIZE = 300;
const HONOR_REPLY_FETCH_SIZE = 500;
const HONOR_REPLY_WEIGHT = 0.5;
const HONOR_ACTIVE_MINIMUM = 10;
const HONOR_CACHE_SECONDS = 600;
const FACE_CACHE_SECONDS = 3600;
const DAILY_FORUM_TOPIC_CACHE_MS = 5 * 60 * 1000;
const DAILY_FORUM_TOPIC_PAGE_SIZE = 500;
const DAILY_FORUM_TOPIC_MAX_PAGES = 2;
const SHANGHAI_OFFSET_SECONDS = 8 * 60 * 60;

type QueryValue = string | number | boolean | undefined;

async function requestJson<T>(
  route: string,
  query: Record<string, QueryValue>,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    const url = new URL(`${API_BASE}/${route}`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });

    const incomingHeaders = await requestHeaders();
    const {
      headers,
      forwardedCustomHeaders
    } = createHu60UpstreamHeaders(incomingHeaders, init?.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    if (!headers.has("user-agent")) {
      headers.set("user-agent", "Hulvlin-Next/0.1");
    }
    if (query._json === undefined && !headers.has("x-json")) {
      headers.set("x-json", "compact");
    }
    let sid = headers.get("x-sid");

    if (!sid) {
      const cookieStore = await cookies();
      sid = cookieStore.get("hulvlin_sid")?.value ?? null;
      if (sid) headers.set("x-sid", sid);
    }

    const shouldRevalidate =
      !sid &&
      !forwardedCustomHeaders &&
      !init?.method &&
      init?.cache !== "no-store";
    const finishLog = beginUpstreamRequest(
      init?.method || "GET",
      url.toString()
    );
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        ...(sid || forwardedCustomHeaders
          ? { cache: "no-store" }
          : shouldRevalidate
            ? { next: { revalidate: 90 } }
            : {})
      });
      finishLog(response.status);
    } catch (error) {
      finishLog(null, error);
      throw error;
    }

    if (!response.ok) return fallback;
    const data = (await response.json()) as T & {
      error?: string | boolean;
      page?: string;
    };
    if (data?.error) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

async function requestPublicJson<T>(
  route: string,
  query: Record<string, QueryValue>,
  fallback: T
): Promise<T> {
  try {
    const url = new URL(`${API_BASE}/${route}`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });

    const incomingHeaders = await requestHeaders();
    const { headers } = createHu60UpstreamHeaders(incomingHeaders, {
      accept: "application/json",
      "user-agent": "Hulvlin-Next/0.1"
    });
    if (query._json === undefined && !headers.has("x-json")) {
      headers.set("x-json", "compact");
    }
    const finishLog = beginUpstreamRequest("GET", url.toString());
    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        cache: "no-store"
      });
      finishLog(response.status);
    } catch (error) {
      finishLog(null, error);
      throw error;
    }
    if (!response.ok) return fallback;

    const data = (await response.json()) as T & {
      error?: string | boolean;
    };
    return data?.error ? fallback : data;
  } catch {
    return fallback;
  }
}

export async function hasCustomHu60RequestHeaders() {
  return hasForwardableHu60Headers(await requestHeaders());
}

type FaceCacheState = {
  memoryCache?: {
    expiresAt: number;
    value: ForumFace[];
  };
  buildPromise?: Promise<ForumFace[]>;
};

const faceCacheState = (() => {
  const scope = globalThis as typeof globalThis & {
    __hulvlinFaceCacheState?: FaceCacheState;
  };
  return (scope.__hulvlinFaceCacheState ??= {});
})();

async function buildFaces(): Promise<ForumFace[]> {
  const response = await requestPublicJson(
    "api.face.json",
    {},
    {
      success: false,
      faceList: {} as Record<string, string>
    }
  );

  return Object.entries(response.faceList ?? {}).map(([name, url]) => ({
    name,
    url: url.startsWith("/") ? `https://hu60.cn${url}` : url
  }));
}

export async function getFaces(): Promise<ForumFace[]> {
  if (await hasCustomHu60RequestHeaders()) return buildFaces();

  const now = Date.now();
  if (
    faceCacheState.memoryCache &&
    faceCacheState.memoryCache.expiresAt > now
  ) {
    return faceCacheState.memoryCache.value;
  }

  if (!faceCacheState.buildPromise) {
    faceCacheState.buildPromise = buildFaces();
  }

  try {
    const faces = await faceCacheState.buildPromise;
    if (faces.length) {
      faceCacheState.memoryCache = {
        expiresAt: Date.now() + FACE_CACHE_SECONDS * 1000,
        value: faces
      };
    }
    return faces;
  } finally {
    faceCacheState.buildPromise = undefined;
  }
}

export async function getActiveTopics(
  page = 1,
  sid?: string
): Promise<HomeResponse> {
  return requestJson(
    "index.index.json",
    {
      p: Math.max(1, page),
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar",
      _time: 1
    },
    fallbackHome,
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function getGlobalTopics(
  page = 1,
  essence = false,
  sid?: string
): Promise<ForumsResponse> {
  return requestJson(
    `bbs.forum.0.${Math.max(1, page)}.${essence ? 1 : 0}.json`,
    {
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      ...fallbackForums,
      currPage: 1,
      maxPage: 1,
      topicList: []
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

async function getWeeklyGlobalTopicsPageUncached(
  page = 1,
  pageSize = 100
): Promise<ForumsResponse> {
  const safePageSize = Math.min(
    1000,
    Math.max(1, Math.trunc(pageSize) || 100)
  );

  return requestPublicJson(
    `bbs.forum.0.${Math.max(1, Math.trunc(page) || 1)}.0.json`,
    {
      pageSize: safePageSize,
      _topic_summary: 0,
      _uinfo: "name,avatar",
      _time: 1,
      _json: "compact"
    },
    {
      ...fallbackForums,
      currPage: Math.max(1, Math.trunc(page) || 1),
      maxPage: 1,
      topicList: [],
      __fallback: true
    }
  );
}

export const getWeeklyGlobalTopicsPage = cache(
  getWeeklyGlobalTopicsPageUncached
);

type DailyForumTopicCacheState = {
  memoryCache?: {
    expiresAt: number;
    value: DailyForumTopicCounts;
  };
  buildPromise?: Promise<DailyForumTopicCounts>;
};

const dailyForumTopicCacheState = (() => {
  const scope = globalThis as typeof globalThis & {
    __hulvlinDailyForumTopicCacheState?: DailyForumTopicCacheState;
  };
  return (scope.__hulvlinDailyForumTopicCacheState ??= {});
})();

function shanghaiDayStart(timestamp: number) {
  const shifted = timestamp + SHANGHAI_OFFSET_SECONDS;
  return (
    Math.floor(shifted / 86_400) * 86_400 -
    SHANGHAI_OFFSET_SECONDS
  );
}

async function buildDailyForumTopicCounts(): Promise<DailyForumTopicCounts> {
  const counts: Record<number, number> = {};
  let updatedAt = Math.floor(Date.now() / 1000);
  const forumForm = await getNewTopicForm();
  if (forumForm.__fallback || !Array.isArray(forumForm.forums)) {
    return { counts: {}, updatedAt: 0, __fallback: true };
  }

  const rootForumById = new Map<number, number>();
  const mapForumTree = (forum: ForumTree, rootId: number) => {
    rootForumById.set(Number(forum.id), rootId);
    for (const child of forum.child ?? []) {
      mapForumTree(child, rootId);
    }
  };
  for (const forum of forumForm.forums) {
    mapForumTree(forum, Number(forum.id));
  }

  for (let page = 1; page <= DAILY_FORUM_TOPIC_MAX_PAGES; page += 1) {
    const response = await getWeeklyGlobalTopicsPage(
      page,
      DAILY_FORUM_TOPIC_PAGE_SIZE
    );
    if (response.__fallback || !Array.isArray(response.topicList)) {
      return { counts: {}, updatedAt: 0, __fallback: true };
    }

    if (page === 1 && response._time) {
      updatedAt = Number(response._time) || updatedAt;
    }
    const dayStart = shanghaiDayStart(updatedAt);
    const topics = response.topicList;

    for (const topic of topics) {
      const activityAt = Number(topic.mtime || topic.ctime) || 0;
      const topicForumId = Number(topic.forum_id) || 0;
      const forumId =
        rootForumById.get(topicForumId) ?? topicForumId;
      if (
        forumId > 0 &&
        activityAt >= dayStart &&
        activityAt <= updatedAt
      ) {
        counts[forumId] = (counts[forumId] ?? 0) + 1;
      }
    }

    const regularActivityTimes = topics
      .filter((topic) => Number(topic.level || 0) === 0)
      .map((topic) => Number(topic.mtime || topic.ctime) || 0);
    const reachedDayBoundary =
      regularActivityTimes.length > 0 &&
      Math.min(...regularActivityTimes) < dayStart;
    const reachedLastPage =
      page >= Math.max(1, Number(response.maxPage) || 1);

    if (
      reachedDayBoundary ||
      reachedLastPage ||
      topics.length < DAILY_FORUM_TOPIC_PAGE_SIZE
    ) {
      break;
    }
  }

  return { counts, updatedAt };
}

export async function getDailyForumTopicCounts() {
  const now = Date.now();
  if (
    dailyForumTopicCacheState.memoryCache &&
    dailyForumTopicCacheState.memoryCache.expiresAt > now
  ) {
    return dailyForumTopicCacheState.memoryCache.value;
  }

  if (!dailyForumTopicCacheState.buildPromise) {
    dailyForumTopicCacheState.buildPromise =
      buildDailyForumTopicCounts();
  }

  try {
    const value = await dailyForumTopicCacheState.buildPromise;
    if (!value.__fallback) {
      dailyForumTopicCacheState.memoryCache = {
        expiresAt: Date.now() + DAILY_FORUM_TOPIC_CACHE_MS,
        value
      };
    }
    return value;
  } finally {
    dailyForumTopicCacheState.buildPromise = undefined;
  }
}

type HonorTopicResponse = {
  topicList: Topic[] | null;
  _time?: number;
  __fallback?: boolean;
};

type HonorCandidate = HonorMember & {
  topicCount: number;
  replyCount: number;
  latestActivityTime: number;
};

let honorMemoryCache:
  | {
      expiresAt: number;
      value: HonorRoll;
    }
  | undefined;
let honorBuildPromise: Promise<HonorRoll> | undefined;

async function buildHonorRoll(): Promise<HonorRoll> {
  const [response, replyResponse] = await Promise.all([
    requestPublicJson<HonorTopicResponse>(
      "bbs.forum.0.1.0.json",
      {
        pageSize: HONOR_TOPIC_FETCH_SIZE,
        _topic_summary: 0,
        _uinfo: "name,avatar",
        _time: 1
      },
      {
        topicList: [],
        __fallback: true
      }
    ),
    getWeeklyReplyFeedPage(1, HONOR_REPLY_FETCH_SIZE)
  ]);

  if (response.__fallback || !Array.isArray(response.topicList)) {
    return {
      legacy: [],
      active: [],
      updatedAt: 0,
      __fallback: true
    };
  }

  const responseTime =
    Number(response._time) || Math.floor(Date.now() / 1000);
  const updatedAt =
    Math.floor(responseTime / HONOR_CACHE_SECONDS) * HONOR_CACHE_SECONDS;
  const topics = response.topicList
    .filter(
      (topic) =>
        Number(topic.mtime || topic.ctime || 0) <= updatedAt
    )
    .slice(0, HONOR_TOPIC_SAMPLE_SIZE);
  const partial =
    replyResponse.__fallback || !Array.isArray(replyResponse.replyList);
  const replies = partial
    ? []
    : Array.from(
        new Map(
          replyResponse.replyList
            .filter(
              (reply) =>
                Number(reply.mtime || reply.ctime || 0) <= updatedAt
            )
            .map((reply) => [Number(reply.id), reply] as const)
        ).values()
      )
        .sort(
          (left, right) =>
            Number(right.mtime || right.ctime || 0) -
            Number(left.mtime || left.ctime || 0)
        )
        .slice(0, HONOR_REPLY_SAMPLE_SIZE);
  const candidateMap = new Map<number, HonorCandidate>();

  for (const topic of topics) {
    const uid = Number(topic.uid);
    if (!Number.isFinite(uid) || uid <= 0) continue;

    const current = candidateMap.get(uid);
    const name =
      topic._u_name || topic.uinfo?.name || current?.name || `用户 ${uid}`;
    candidateMap.set(uid, {
      uid,
      name,
      avatar: topic._u_avatar || current?.avatar || null,
      topicCount: (current?.topicCount ?? 0) + 1,
      replyCount: current?.replyCount ?? 0,
      latestActivityTime: Math.max(
        current?.latestActivityTime ?? 0,
        Number(topic.mtime || topic.ctime) || 0
      )
    });
  }

  for (const reply of replies) {
    const uid = Number(reply.uid);
    if (!Number.isFinite(uid) || uid <= 0) continue;

    const current = candidateMap.get(uid);
    const name =
      reply._u_name || reply.uinfo?.name || current?.name || `用户 ${uid}`;
    candidateMap.set(uid, {
      uid,
      name,
      avatar: reply._u_avatar || current?.avatar || null,
      topicCount: current?.topicCount ?? 0,
      replyCount: (current?.replyCount ?? 0) + 1,
      latestActivityTime: Math.max(
        current?.latestActivityTime ?? 0,
        Number(reply.mtime || reply.ctime) || 0
      )
    });
  }

  const candidates = Array.from(candidateMap.values());

  const toHonorMember = (candidate: HonorCandidate): HonorMember => ({
    uid: candidate.uid,
    name: candidate.name,
    avatar: candidate.avatar,
    memberTitle: getMemberTitleByUid(candidate.uid)
  });

  const rankedCandidates = candidates.map((candidate) => ({
    activityScore:
      candidate.topicCount + candidate.replyCount * HONOR_REPLY_WEIGHT,
    candidate,
    member: toHonorMember(candidate)
  }));

  const legacy = rankedCandidates
    .filter(
      ({ activityScore, member }) =>
        activityScore > 0 && Boolean(member.memberTitle)
    )
    .sort(
      (left, right) =>
        right.activityScore - left.activityScore ||
        right.candidate.latestActivityTime -
          left.candidate.latestActivityTime ||
        left.candidate.uid - right.candidate.uid
    )
    .map(({ member }) => member);

  const active = rankedCandidates
    .filter(({ activityScore }) => activityScore >= HONOR_ACTIVE_MINIMUM)
    .sort(
      (left, right) =>
        right.activityScore - left.activityScore ||
        right.candidate.latestActivityTime -
          left.candidate.latestActivityTime ||
        left.candidate.uid - right.candidate.uid
    )
    .map(({ member }) => member);

  return {
    legacy,
    active,
    updatedAt,
    partial
  };
}

export async function getHonorRoll(): Promise<HonorRoll> {
  const now = Date.now();
  if (honorMemoryCache && honorMemoryCache.expiresAt > now) {
    return honorMemoryCache.value;
  }

  if (!honorBuildPromise) {
    honorBuildPromise = buildHonorRoll();
  }

  try {
    const fresh = await honorBuildPromise;
    if (!fresh.__fallback) {
      honorMemoryCache = {
        expiresAt: Date.now() + HONOR_CACHE_SECONDS * 1000,
        value: fresh
      };
    }
    return fresh;
  } finally {
    honorBuildPromise = undefined;
  }
}

function cacheStatus(
  key: string,
  label: string,
  description: string,
  ttlMs: number,
  cache: { expiresAt: number } | undefined,
  building: boolean,
  entryCount?: number
): CacheStatus {
  const now = Date.now();
  return {
    key,
    label,
    description,
    ttlMs,
    lastUpdatedAt: cache ? cache.expiresAt - ttlMs : null,
    expiresAt: cache?.expiresAt ?? null,
    state: building
      ? "building"
      : !cache
        ? "empty"
        : cache.expiresAt > now
          ? "fresh"
          : "expired",
    ...(entryCount === undefined ? {} : { entryCount })
  };
}

export function getHu60CacheStatuses(): CacheStatus[] {
  return [
    cacheStatus(
      "faces",
      "表情列表",
      "发帖和回复编辑器使用的论坛表情",
      FACE_CACHE_SECONDS * 1000,
      faceCacheState.memoryCache,
      Boolean(faceCacheState.buildPromise),
      faceCacheState.memoryCache?.value.length
    ),
    cacheStatus(
      "daily-forum-topics",
      "今日版块主题数",
      "按上海自然日统计各版块新建主题",
      DAILY_FORUM_TOPIC_CACHE_MS,
      dailyForumTopicCacheState.memoryCache,
      Boolean(dailyForumTopicCacheState.buildPromise),
      dailyForumTopicCacheState.memoryCache
        ? Object.keys(dailyForumTopicCacheState.memoryCache.value.counts).length
        : 0
    ),
    cacheStatus(
      "honor-roll",
      "社区荣誉榜",
      "活跃荣誉和资历荣誉排名",
      HONOR_CACHE_SECONDS * 1000,
      honorMemoryCache,
      Boolean(honorBuildPromise),
      honorMemoryCache
        ? honorMemoryCache.value.active.length +
            honorMemoryCache.value.legacy.length
        : 0
    )
  ];
}

export async function refreshHu60Cache(key: string) {
  if (key === "faces") {
    if (!faceCacheState.buildPromise) {
      faceCacheState.buildPromise = buildFaces();
    }
    try {
      const value = await faceCacheState.buildPromise;
      if (!value.length) throw new Error("表情接口没有返回可缓存的数据");
      faceCacheState.memoryCache = {
        expiresAt: Date.now() + FACE_CACHE_SECONDS * 1000,
        value
      };
      return;
    } finally {
      faceCacheState.buildPromise = undefined;
    }
  }

  if (key === "daily-forum-topics") {
    if (!dailyForumTopicCacheState.buildPromise) {
      dailyForumTopicCacheState.buildPromise =
        buildDailyForumTopicCounts();
    }
    try {
      const value = await dailyForumTopicCacheState.buildPromise;
      if (value.__fallback) throw new Error("今日版块主题统计更新失败");
      dailyForumTopicCacheState.memoryCache = {
        expiresAt: Date.now() + DAILY_FORUM_TOPIC_CACHE_MS,
        value
      };
      return;
    } finally {
      dailyForumTopicCacheState.buildPromise = undefined;
    }
  }

  if (key === "honor-roll") {
    if (!honorBuildPromise) honorBuildPromise = buildHonorRoll();
    try {
      const value = await honorBuildPromise;
      if (value.__fallback) throw new Error("社区荣誉榜更新失败");
      honorMemoryCache = {
        expiresAt: Date.now() + HONOR_CACHE_SECONDS * 1000,
        value
      };
      return;
    } finally {
      honorBuildPromise = undefined;
    }
  }

  throw new Error("未知的缓存项目");
}

export async function getForums(): Promise<ForumsResponse> {
  return requestJson(
    "bbs.forum.json",
    {
      pageSize: 3,
      _uinfo: "name,avatar"
    },
    fallbackForums
  );
}

export async function getNewTopicForm(): Promise<NewTopicFormResponse> {
  const form = await requestJson(
    "bbs.newtopic.json",
    {},
    {
      isLogin: null,
      forums: [],
      __fallback: true
    },
    { cache: "no-store" }
  );

  function normalizeForum(forum: ForumTree): ForumTree {
    return {
      id: Number(forum.id),
      name: String(forum.name ?? ""),
      notopic: Number(forum.notopic ?? 0),
      access:
        forum.access === undefined ? undefined : Number(forum.access),
      child: Array.isArray(forum.child)
        ? forum.child.map(normalizeForum)
        : []
    };
  }

  return {
    ...form,
    forums: Array.isArray(form.forums)
      ? form.forums.map(normalizeForum)
      : []
  };
}

export async function getForum(
  id: number,
  page = 1
): Promise<ForumsResponse> {
  return requestJson(
    `bbs.forum.${id}.${Math.max(1, page)}.0.json`,
    {
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      ...fallbackForums,
      fName: "版块暂时不可用",
      childForum: [],
      topicList: []
    }
  );
}

async function getTopicUncached(
  id: number,
  page: number,
  sid?: string
): Promise<TopicResponse> {
  return requestJson(
    `bbs.topic.${id}.${Math.max(1, page)}.json`,
    {
      pageSize: TOPICS_PER_PAGE,
      floorReverse: 0,
      _uinfo: "name,avatar,sign",
      _content: "html",
      _myself: "newMsg,newAtInfo,permissions",
      _time: 1
    },
    fallbackTopic,
    sid
      ? {
          headers: { "x-sid": sid },
          cache: "no-store"
        }
      : undefined
  );
}

const getTopicCached = cache(getTopicUncached);

export function getTopic(
  id: number,
  page = 1,
  sid?: string
): Promise<TopicResponse> {
  return getTopicCached(id, Math.max(1, page), sid);
}

export async function getTopicMain(
  id: number,
  sid?: string
): Promise<TopicResponse> {
  return requestJson(
    `bbs.topic.${id}.1.json`,
    {
      pageSize: 1,
      floorReverse: 0,
      _uinfo: "name,avatar,sign",
      _content: "html",
      _time: 1
    },
    fallbackTopic,
    sid
      ? {
          headers: { "x-sid": sid },
          cache: "no-store"
        }
      : undefined
  );
}

export async function getEditPostForm(
  topicId: number,
  contentId: number,
  page = 1,
  sid?: string
): Promise<EditPostFormResponse> {
  return requestJson(
    `bbs.edittopic.${topicId}.${contentId}.${Math.max(1, page)}.json`,
    {},
    {
      success: false,
      notice: "暂时无法读取帖子内容。",
      isLogin: null,
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function searchTopics(
  query: string,
  page = 1
): Promise<SearchResponse> {
  if (!query.trim()) return fallbackSearch("");

  return requestJson(
    "bbs.search.json",
    {
      keywords: query.trim(),
      p: Math.max(1, page),
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar"
    },
    fallbackSearch(query)
  );
}

export async function getUserProfile(uid: number): Promise<UserProfile> {
  const safeUid = Math.max(1, Math.trunc(uid) || 1);

  return requestJson(
    `user.info.${safeUid}.json`,
    {
      _uinfo: "name,avatar,sign",
      _time: 1
    },
    {
      uid: safeUid,
      name: `用户 ${safeUid}`,
      signature: "暂时无法读取这位用户的资料。",
      regtime: 0,
      _u_name: `用户 ${safeUid}`,
      _u_avatar: null,
      _u_signature: "暂时无法读取这位用户的资料。",
      __fallback: true
    }
  );
}

export async function getUserTopics(
  username: string,
  page = 1
): Promise<SearchResponse> {
  return requestJson(
    "bbs.search.json",
    {
      keywords: "",
      username,
      p: Math.max(1, page),
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      success: false,
      topicCount: 0,
      currPage: 1,
      maxPage: 1,
      topicList: [],
      __fallback: true
    }
  );
}

export async function getUserReplies(
  username: string,
  page = 1
): Promise<UserRepliesResponse> {
  return requestJson(
    "bbs.search.json",
    {
      keywords: "",
      username,
      searchType: "reply",
      p: Math.max(1, page),
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar",
      _content: "html",
      _time: 1
    },
    {
      success: false,
      uid: null,
      replyCount: 0,
      currPage: 1,
      maxPage: 1,
      replyList: [],
      __fallback: true
    }
  );
}

async function getWeeklyReplyFeedPageUncached(
  page = 1,
  pageSize = 100
): Promise<UserRepliesResponse> {
  const safePageSize = Math.min(
    1000,
    Math.max(1, Math.trunc(pageSize) || 100)
  );

  return requestPublicJson(
    "bbs.search.json",
    {
      keywords: "",
      searchType: "reply",
      p: Math.max(1, Math.trunc(page) || 1),
      pageSize: safePageSize,
      showBot: 0,
      _content: "text",
      _uinfo: "name,avatar",
      _time: 1,
      _json: "compact"
    },
    {
      success: false,
      uid: null,
      replyCount: 0,
      currPage: Math.max(1, Math.trunc(page) || 1),
      maxPage: 1,
      replyList: [],
      __fallback: true
    }
  );
}

export const getWeeklyReplyFeedPage = cache(
  getWeeklyReplyFeedPageUncached
);

export type ReviewQueueFilter = "pending" | "mine" | "rejected";

function reviewFilterValue(filter: ReviewQueueFilter) {
  if (filter === "mine") return -1;
  if (filter === "rejected") return 3;
  return 1;
}

export async function getReviewQueue(
  page = 1,
  sid?: string,
  filter: ReviewQueueFilter = "pending",
  showBot = false
): Promise<ReviewQueueResponse> {
  const safePage = Math.max(1, Math.trunc(page) || 1);

  return requestJson(
    "bbs.search.json",
    {
      keywords: "",
      searchType: "reply",
      onlyReview: reviewFilterValue(filter),
      showBot: showBot ? 1 : 0,
      p: safePage,
      pageSize: 20,
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      success: false,
      uid: null,
      replyCount: 0,
      currPage: safePage,
      maxPage: 1,
      replyList: [],
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function getWeeklyUserTopicsPage(
  username: string,
  page = 1,
  pageSize = 100
): Promise<SearchResponse> {
  const safePageSize = Math.min(
    1000,
    Math.max(1, Math.trunc(pageSize) || 100)
  );

  return requestPublicJson(
    "bbs.search.json",
    {
      keywords: "",
      username,
      order: "ctime",
      p: Math.max(1, Math.trunc(page) || 1),
      pageSize: safePageSize,
      _uinfo: "name,avatar",
      _time: 1,
      _json: "compact"
    },
    {
      success: false,
      uid: null,
      topicCount: 0,
      currPage: Math.max(1, Math.trunc(page) || 1),
      maxPage: 1,
      topicList: [],
      __fallback: true
    }
  );
}

async function getUserStatusUncached(sid?: string): Promise<UserStatus> {
  const anonymous: UserStatus = {
    uid: null,
    name: null,
    isLogin: null,
    newMsg: 0,
    newAtInfo: 0
  };

  if (!sid) return anonymous;

  const status = await requestJson(
    "user.stat.json",
    { pageSize: 1 },
    anonymous,
    {
      headers: { "x-sid": sid },
      cache: "no-store"
    }
  );
  if (status.isLogin === true && Number(status.uid) > 0) {
    recordRecentVisitor(Number(status.uid), status.name);
  }
  return status;
}

export const getUserStatus = cache(getUserStatusUncached);

export async function getRelationships(
  type: RelationshipType,
  page = 1,
  sid?: string
): Promise<RelationshipResponse> {
  return requestJson(
    `user.relationship.${type}.json`,
    {
      page: Math.max(1, page),
      pageSize: 30,
      _time: 1
    },
    {
      type,
      title: "",
      currPage: Math.max(1, page),
      maxPage: Math.max(1, page),
      userList: [],
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function getMessages(
  type: "inbox" | "mentions" | "sent",
  page = 1,
  sid?: string
): Promise<MessagesResponse> {
  const route =
    type === "inbox"
      ? "msg.index.inbox.all.json"
      : type === "mentions"
        ? "msg.index.@.json"
        : "msg.index.outbox.all.json";
  return requestJson(
    route,
    {
      p: Math.max(1, page),
      pageSize: 15,
      _content: "html",
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      msgCount: 0,
      currPage: 1,
      maxPage: 1,
      msgList: [],
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function getPublicChat(
  page = 1,
  sid?: string
): Promise<ChatResponse> {
  return requestJson(
    "addin.chat.公共聊天室.json",
    {
      p: Math.max(1, page),
      pageSize: 20,
      _content: "html",
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      chatRomName: "公共聊天室",
      isLogin: null,
      chatCount: 0,
      currPage: 1,
      maxPage: 1,
      chatList: [],
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function getFavoriteTopics(
  page = 1,
  sid?: string
): Promise<FavoriteTopicsResponse> {
  return requestJson(
    "bbs.myfavorite.json",
    {
      p: Math.max(1, page),
      pageSize: TOPICS_PER_PAGE,
      _topic_summary: 180,
      _uinfo: "name,avatar",
      _time: 1
    },
    {
      success: false,
      notice: "暂时无法读取收藏。",
      topicCount: 0,
      currPage: 1,
      maxPage: 1,
      topicList: [],
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}

export async function getAccountProfile(
  sid?: string
): Promise<AccountProfile> {
  return requestJson(
    "user.index.json",
    { _time: 1 },
    {
      uid: 0,
      name: "",
      signature: "",
      contact: "",
      hasRegPhone: false,
      __fallback: true
    },
    {
      ...(sid ? { headers: { "x-sid": sid } } : {}),
      cache: "no-store"
    }
  );
}
