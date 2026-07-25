export type Topic = {
  id: number;
  topic_id: number;
  content_id?: number;
  title: string;
  read_count: number;
  reply_count: number;
  uid: number;
  ctime: number;
  mtime: number;
  level?: number;
  essence?: number;
  forum_id: number;
  forum_name: string;
  locked?: number;
  review?: number;
  _u_name?: string | null;
  _u_avatar?: string | null;
  _u_signature?: string | null;
  _topic_summary?: string | null;
  uinfo?: { name?: string | null };
};

export type Forum = {
  id: number;
  name: string;
  parent_id?: number;
  notopic?: number;
  newTopic?: Topic[] | null;
};

export type ForumIndex = {
  id: number;
  name: string;
  parent_id?: number;
  notopic?: number;
};

export type HomeResponse = {
  userInfo?: {
    uid?: number | null;
    name?: string | null;
    isLogin?: boolean | null;
  };
  currPage: number;
  hasNextPage: boolean;
  newTopicList: Topic[];
  _time?: number;
  __fallback?: boolean;
};

export type ForumsResponse = {
  fName: string;
  fIndex: ForumIndex[];
  childForum: Forum[];
  topicList: Topic[] | null;
  currPage?: number;
  maxPage?: number;
  __fallback?: boolean;
};

export type Floor = {
  uid: number;
  ctime: number;
  mtime: number;
  content: string;
  floor: number;
  id: number;
  topic_id: number;
  locked?: number;
  flags?: number;
  canEdit?: boolean;
  canDel?: boolean;
  _u_name?: string | null;
  _u_avatar?: string | null;
  _u_signature?: string | null;
};

export type TopicMeta = {
  title: string;
  read_count: number;
  uid: number;
  ctime: number;
  mtime: number;
  essence?: number;
  locked?: number;
  review?: number;
  level?: number;
  access?: number;
  _u_name?: string | null;
  _u_avatar?: string | null;
  _u_signature?: string | null;
};

export type TopicResponse = {
  fName: string;
  fIndex: ForumIndex[];
  tMeta: TopicMeta;
  floorCount: number;
  currPage: number;
  maxPage: number;
  isLogin?: boolean | null;
  blockedReply?: number;
  floorReverse?: boolean;
  canReply?: boolean;
  tContents: Floor[];
  __fallback?: boolean;
};

export type SearchResponse = {
  success?: boolean;
  uid?: number | null;
  topicCount: number;
  currPage: number;
  maxPage: number;
  topicList: Topic[];
  __fallback?: boolean;
};

export type UserStatus = {
  uid: number | null;
  name: string | null;
  isLogin: boolean | null;
  permissions?: string[];
  newMsg: number;
  newAtInfo: number;
  newChats: unknown;
};
