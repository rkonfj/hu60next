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

export type ForumTree = {
  id: number;
  name: string;
  notopic: number;
  access?: number;
  child: ForumTree[];
};

export type ForumFace = {
  name: string;
  url: string;
};

export type NewTopicFormResponse = {
  isLogin?: boolean | null;
  token?: string;
  forums: ForumTree[];
  __fallback?: boolean;
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

export type HonorMember = {
  uid: number;
  name: string;
  avatar?: string | null;
};

export type HonorRoll = {
  legacy: HonorMember[];
  active: HonorMember[];
  updatedAt: number;
  __fallback?: boolean;
};

export type ForumsResponse = {
  fName: string;
  fIndex: ForumIndex[];
  childForum: Forum[];
  topicList: Topic[] | null;
  currPage?: number;
  maxPage?: number;
  _time?: number;
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
  token?: string;
  tContents: Floor[];
  __fallback?: boolean;
};

export type EditPostFormResponse = {
  success?: boolean;
  notice?: string;
  tMeta?: {
    title: string;
    uid: number;
    content_id: number;
    locked?: number;
    access?: number;
    review?: number;
  };
  floorMeta?: {
    uid: number;
    topic_id: number;
    floor: number;
    locked?: number;
  };
  isLogin?: boolean | null;
  token?: string;
  needReason?: boolean;
  editTitle?: boolean;
  title?: string;
  content?: string;
  preview?: string;
  __fallback?: boolean;
};

export type SearchResponse = {
  success?: boolean;
  uid?: number | null;
  topicCount: number;
  currPage: number;
  maxPage: number;
  topicList: Topic[];
  _time?: number;
  __fallback?: boolean;
};

export type UserReply = {
  id: number;
  topic_id: number;
  uid: number;
  floor: number;
  ctime: number;
  mtime: number;
  content: string;
  _u_name?: string | null;
  _u_avatar?: string | null;
  _u_signature?: string | null;
  topic: {
    id: number;
    title: string;
    forum_id: number;
    read_count?: number;
    _topic_summary?: string | null;
  };
};

export type UserRepliesResponse = {
  success?: boolean;
  uid?: number | null;
  replyCount: number;
  currPage: number;
  maxPage: number;
  replyList: UserReply[];
  _time?: number;
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

export type MessageItem = {
  id: number;
  touid: number;
  byuid: number;
  type: 0 | 1;
  isread: 0 | 1;
  content: string;
  ctime: number;
  rtime?: number;
  to_u_name?: string | null;
  to_u_avatar?: string | null;
  to_u_signature?: string | null;
  by_u_name?: string | null;
  by_u_avatar?: string | null;
  by_u_signature?: string | null;
  byUinfo?: { name?: string | null };
  toUinfo?: { name?: string | null };
};

export type MessagesResponse = {
  uid?: number | null;
  msgCount: number;
  currPage: number;
  maxPage: number;
  msgList: MessageItem[];
  _time?: number;
  __fallback?: boolean;
};

export type ChatItem = {
  id: number;
  lid: number;
  room: string;
  uid: number;
  time: number;
  content: string;
  review?: number;
  hidden?: number;
  flags?: number;
  canDel?: boolean;
  _u_name?: string | null;
  _u_avatar?: string | null;
  _u_signature?: string | null;
};

export type ChatResponse = {
  chatRomName: string;
  isLogin?: boolean | null;
  chatCount: number;
  currPage: number;
  maxPage: number;
  blockedReply?: number;
  token?: string;
  chatList: ChatItem[];
  _time?: number;
  __fallback?: boolean;
};

export type UserProfile = {
  uid: number;
  name: string;
  signature?: string | null;
  contact?: string | null;
  regtime?: number;
  blockPostStat?: boolean;
  isFollow?: boolean;
  isBlock?: boolean;
  hideUserCSS?: boolean;
  permissions?: string[];
  _time?: number;
  _u_name?: string | null;
  _u_avatar?: string | null;
  _u_signature?: string | null;
  _u_contact?: string | null;
  __fallback?: boolean;
};

export type AccountProfile = {
  uid: number;
  name: string;
  mail?: string | null;
  signature?: string | null;
  contact?: string | null;
  regtime?: number;
  hasRegPhone?: boolean;
  floorReverse?: boolean;
  siteAdmin?: boolean;
  permissions?: string[];
  __fallback?: boolean;
};

export type FavoriteTopicsResponse = {
  success?: boolean;
  notice?: string | null;
  topicCount: number;
  currPage: number;
  maxPage: number;
  topicList: Topic[];
  _time?: number;
  __fallback?: boolean;
};
