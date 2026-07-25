import {
  fallbackForums,
  fallbackHome,
  fallbackSearch,
  fallbackTopic
} from "@/lib/fallback-data";
import type {
  ForumsResponse,
  HomeResponse,
  SearchResponse,
  TopicResponse,
  UserStatus
} from "@/lib/types";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

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

    const shouldRevalidate = !init?.method && init?.cache !== "no-store";
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "user-agent": "Hulvlin-Next/0.1",
        ...init?.headers
      },
      ...(shouldRevalidate ? { next: { revalidate: 90 } } : {})
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

export function avatarUrl(value?: string | null) {
  if (!value || value === "/upload/default.jpg") return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://hu60.cn${value}`;
  return value.replace("http://", "https://");
}

export async function getHome(page = 1): Promise<HomeResponse> {
  return requestJson(
    "index.index.json",
    {
      p: Math.max(1, page),
      pageSize: 12,
      _topic_summary: 180,
      _uinfo: "name,avatar,sign",
      _time: 1
    },
    fallbackHome
  );
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

export async function getForum(
  id: number,
  page = 1
): Promise<ForumsResponse> {
  return requestJson(
    `bbs.forum.${id}.${Math.max(1, page)}.0.json`,
    {
      pageSize: 15,
      _topic_summary: 180,
      _uinfo: "name,avatar,sign",
      _time: 1
    },
    {
      ...fallbackForums,
      fName:
        fallbackForums.childForum.find((forum) => forum.id === id)?.name ??
        "社区版块",
      childForum: [],
      topicList: fallbackHome.newTopicList
    }
  );
}

export async function getTopic(
  id: number,
  page = 1
): Promise<TopicResponse> {
  return requestJson(
    `bbs.topic.${id}.${Math.max(1, page)}.json`,
    {
      pageSize: 30,
      floorReverse: 0,
      _uinfo: "name,avatar,sign",
      _content: "html",
      _time: 1
    },
    fallbackTopic
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
      pageSize: 15,
      _topic_summary: 180,
      _uinfo: "name,avatar"
    },
    fallbackSearch(query)
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
