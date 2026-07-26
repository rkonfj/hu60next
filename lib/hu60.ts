import { cookies } from "next/headers";
import {
  fallbackForums,
  fallbackHome,
  fallbackSearch,
  fallbackTopic
} from "@/lib/fallback-data";
import type {
  ChatResponse,
  AccountProfile,
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
  SearchResponse,
  Topic,
  TopicResponse,
  UserProfile,
  UserRepliesResponse,
  UserStatus
} from "@/lib/types";
import { getMemberTitle } from "@/lib/member";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";
const TOPICS_PER_PAGE = 30;
const HONOR_TOPIC_SAMPLE_SIZE = 300;
const HONOR_TOPIC_FETCH_SIZE = 360;
const HONOR_ACTIVE_MINIMUM = 8;
const HONOR_CACHE_SECONDS = 600;
const HONOR_CACHE_KEY =
  "https://hulvlin-next.rkonfj.chatgpt.site/__cache/honors-v4";
// 16643 是 2012 年最后一位注册会员。
const HONOR_LEGEND_UID_MAX = 16643;
// HU60 的 UID 按注册顺序分配；21696 是 2016 年最后一位注册会员。
const HONOR_LEGACY_UID_MAX = 21696;

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

    const headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    if (!headers.has("user-agent")) {
      headers.set("user-agent", "Hulvlin-Next/0.1");
    }
    let sid = headers.get("x-sid");

    if (!sid) {
      const cookieStore = await cookies();
      sid = cookieStore.get("hulvlin_sid")?.value ?? null;
      if (sid) headers.set("x-sid", sid);
    }

    const shouldRevalidate =
      !sid && !init?.method && init?.cache !== "no-store";
    const response = await fetch(url, {
      ...init,
      headers,
      ...(sid
        ? { cache: "no-store" }
        : shouldRevalidate
          ? { next: { revalidate: 90 } }
          : {})
    });

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

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Hulvlin-Next/0.1"
      },
      cache: "no-store"
    });
    if (!response.ok) return fallback;

    const data = (await response.json()) as T & {
      error?: string | boolean;
    };
    return data?.error ? fallback : data;
  } catch {
    return fallback;
  }
}

export function avatarUrl(value?: string | null) {
  if (!value || value === "/upload/default.jpg") return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://hu60.cn${value}`;
  return value.replace("http://", "https://");
}

export async function getFaces(): Promise<ForumFace[]> {
  const response = await requestJson(
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
      _uinfo: "name,avatar,sign",
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
      _uinfo: "name,avatar,sign",
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

type HonorTopicResponse = {
  topicList: Topic[] | null;
  _time?: number;
  __fallback?: boolean;
};

type HonorCandidate = HonorMember & {
  recentCount: number;
  latestTopicTime: number;
};

let honorMemoryCache:
  | {
      expiresAt: number;
      value: HonorRoll;
    }
  | undefined;

async function getHonorEdgeCache() {
  const cacheStorage = globalThis.caches as
    | (CacheStorage & { default?: Cache })
    | undefined;
  if (!cacheStorage) return undefined;
  if (cacheStorage.default) return cacheStorage.default;

  try {
    return await cacheStorage.open("hulvlin-honors");
  } catch {
    return undefined;
  }
}

async function getEarlyMemberTitle(uid: number) {
  const profile = await requestPublicJson<UserProfile>(
    `user.info.${uid}.json`,
    { _time: 1 },
    {
      uid,
      name: "",
      __fallback: true
    }
  );

  return profile.__fallback ? null : getMemberTitle(profile.regtime);
}

async function buildHonorRoll(): Promise<HonorRoll> {
  const response = await requestPublicJson<HonorTopicResponse>(
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
  );

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
      recentCount: (current?.recentCount ?? 0) + 1,
      latestTopicTime: Math.max(
        current?.latestTopicTime ?? 0,
        Number(topic.ctime) || 0
      )
    });
  }

  const candidates = Array.from(candidateMap.values());
  const earlyCandidates = candidates.filter(
    (candidate) => candidate.uid <= HONOR_LEGEND_UID_MAX
  );
  const earlyTitles = new Map(
    await Promise.all(
      earlyCandidates.map(async (candidate) => [
        candidate.uid,
        await getEarlyMemberTitle(candidate.uid)
      ] as const)
    )
  );

  const toHonorMember = (candidate: HonorCandidate): HonorMember => ({
    uid: candidate.uid,
    name: candidate.name,
    avatar: candidate.avatar,
    memberTitle:
      candidate.uid <= HONOR_LEGEND_UID_MAX
        ? earlyTitles.get(candidate.uid)
        : candidate.uid <= HONOR_LEGACY_UID_MAX
          ? "骨灰"
          : null
  });

  const legacy = candidates
    .filter((candidate) => candidate.uid <= HONOR_LEGACY_UID_MAX)
    .sort(
      (left, right) =>
        right.recentCount - left.recentCount || left.uid - right.uid
    )
    .map(toHonorMember);

  const active = candidates
    .filter((candidate) => candidate.recentCount >= HONOR_ACTIVE_MINIMUM)
    .sort(
      (left, right) =>
        right.recentCount - left.recentCount ||
        right.latestTopicTime - left.latestTopicTime ||
        left.uid - right.uid
    )
    .map(toHonorMember);

  return {
    legacy,
    active,
    updatedAt
  };
}

export async function getHonorRoll(): Promise<HonorRoll> {
  const now = Date.now();
  if (honorMemoryCache && honorMemoryCache.expiresAt > now) {
    return honorMemoryCache.value;
  }

  const edgeCache = await getHonorEdgeCache();
  const edgeCacheKey = new Request(HONOR_CACHE_KEY);
  if (edgeCache) {
    try {
      const cachedResponse = await edgeCache.match(edgeCacheKey);
      if (cachedResponse) {
        const cached = (await cachedResponse.json()) as HonorRoll;
        honorMemoryCache = {
          expiresAt: Math.max(
            now + 1000,
            cached.updatedAt * 1000 + HONOR_CACHE_SECONDS * 1000
          ),
          value: cached
        };
        return cached;
      }
    } catch {
      // Local Next.js and non-Cloudflare runtimes may not expose Cache API.
    }
  }

  const fresh = await buildHonorRoll();
  if (!fresh.__fallback) {
    honorMemoryCache = {
      expiresAt: fresh.updatedAt * 1000 + HONOR_CACHE_SECONDS * 1000,
      value: fresh
    };

    if (edgeCache) {
      try {
        const remainingSeconds = Math.max(
          1,
          Math.ceil(
            (fresh.updatedAt * 1000 +
              HONOR_CACHE_SECONDS * 1000 -
              now) /
              1000
          )
        );
        await edgeCache.put(
          edgeCacheKey,
          new Response(JSON.stringify(fresh), {
            headers: {
              "cache-control": `public, max-age=${remainingSeconds}`,
              "content-type": "application/json; charset=utf-8"
            }
          })
        );
      } catch {
        // The in-memory cache remains available when edge storage is absent.
      }
    }
  }

  return fresh;
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
      _uinfo: "name,avatar,sign",
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

export async function getTopic(
  id: number,
  page = 1,
  sid?: string
): Promise<TopicResponse> {
  return requestJson(
    `bbs.topic.${id}.${Math.max(1, page)}.json`,
    {
      pageSize: TOPICS_PER_PAGE,
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

type FavoriteLookupResponse = {
  topicList?: Topic[] | null;
  currPage?: number;
  maxPage?: number;
};

export async function isTopicFavorite(
  topicId: number,
  sid?: string
): Promise<boolean> {
  if (!sid) return false;

  let page = 1;
  let maxPage = 1;

  do {
    const favorites = await requestJson<FavoriteLookupResponse>(
      "bbs.myfavorite.json",
      {
        p: page,
        pageSize: 100
      },
      {
        topicList: [],
        currPage: page,
        maxPage: page
      },
      {
        headers: { "x-sid": sid },
        cache: "no-store"
      }
    );

    if (
      favorites.topicList?.some(
        (topic) => topic.id === topicId || topic.topic_id === topicId
      )
    ) {
      return true;
    }

    maxPage = Math.max(page, favorites.maxPage ?? page);
    page += 1;
  } while (page <= maxPage);

  return false;
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
      _uinfo: "name,avatar,sign",
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
      _uinfo: "name,avatar,sign",
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

export async function getUserStatus(sid?: string): Promise<UserStatus> {
  const anonymous: UserStatus = {
    uid: null,
    name: null,
    isLogin: null,
    newMsg: 0,
    newAtInfo: 0,
    newChats: null
  };

  if (!sid) return anonymous;

  return requestJson(
    "user.stat.json",
    { pageSize: 3 },
    anonymous,
    {
      headers: { "x-sid": sid },
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
      _uinfo: "name,avatar,sign",
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
      _uinfo: "name,avatar,sign",
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
      _uinfo: "name,avatar,sign",
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
