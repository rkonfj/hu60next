import type {
  ForumsResponse,
  HomeResponse,
  SearchResponse,
  TopicResponse
} from "@/lib/types";

export const fallbackHome: HomeResponse = {
  currPage: 1,
  hasNextPage: false,
  newTopicList: [],
  __fallback: true
};

export const fallbackForums: ForumsResponse = {
  fName: "社区版块",
  fIndex: [],
  childForum: [],
  topicList: null,
  currPage: 1,
  maxPage: 1,
  __fallback: true
};

export const fallbackTopic: TopicResponse = {
  fName: "",
  fIndex: [],
  tMeta: {
    title: "帖子暂时不可用",
    read_count: 0,
    uid: 0,
    ctime: 0,
    mtime: 0
  },
  floorCount: 0,
  currPage: 1,
  maxPage: 1,
  canReply: false,
  tContents: [],
  __fallback: true
};

export function fallbackSearch(_query: string): SearchResponse {
  return {
    success: false,
    topicCount: 0,
    currPage: 1,
    maxPage: 1,
    topicList: [],
    __fallback: true
  };
}
