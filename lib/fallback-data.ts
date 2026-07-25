import type {
  ForumsResponse,
  HomeResponse,
  SearchResponse,
  TopicResponse
} from "@/lib/types";

const now = Math.floor(Date.now() / 1000);

export const fallbackHome: HomeResponse = {
  currPage: 1,
  hasNextPage: true,
  _time: now,
  __fallback: true,
  newTopicList: [
    {
      id: 107454,
      topic_id: 107454,
      title: "从 Hardware Lab Kit 提取测试用例：显卡兼容性实践",
      read_count: 214,
      reply_count: 4,
      uid: 1,
      ctime: now - 3600,
      mtime: now - 900,
      forum_id: 6,
      forum_name: "Windows",
      _u_name: "老虎会游泳",
      _u_avatar: "https://file.hu60.cn/avatar/1.jpg?r=1660225893",
      _topic_summary:
        "整理了一组实用测试用例与运行方式，用于验证显卡驱动的兼容性，并记录常见问题。"
    },
    {
      id: 107448,
      topic_id: 107448,
      title: "为 OpenHarmony 构建 Wine Hangover 的一些记录",
      read_count: 401,
      reply_count: 8,
      uid: 1,
      ctime: now - 7200,
      mtime: now - 2400,
      forum_id: 229,
      forum_name: "鸿蒙PC",
      _u_name: "老虎会游泳",
      _u_avatar: "https://file.hu60.cn/avatar/1.jpg?r=1660225893",
      _topic_summary:
        "从工具链准备、构建参数到运行时限制，记录在 ARM64 平台上的完整尝试过程。"
    },
    {
      id: 107441,
      topic_id: 107441,
      title: "Rust 原生 UI 框架，为什么不能再简单一点？",
      read_count: 769,
      reply_count: 13,
      uid: 17189,
      ctime: now - 10800,
      mtime: now - 3600,
      forum_id: 224,
      forum_name: "其他编程语言",
      _u_name: "森森",
      _u_avatar: "/upload/default.jpg",
      _topic_summary:
        "用组合与 trait 构建界面，以强类型消息驱动状态，分享一个 Rust-first 的轻量原生 UI 实验。"
    },
    {
      id: 107442,
      topic_id: 107442,
      title: "体验了移动端工具的 MCP 功能，聊聊实际感受",
      read_count: 619,
      reply_count: 6,
      uid: 22230,
      ctime: now - 18000,
      mtime: now - 5200,
      forum_id: 213,
      forum_name: "手机应用",
      _u_name: "hik",
      _u_avatar: "/upload/default.jpg",
      _topic_summary:
        "从连接方式、可操作范围和移动场景出发，记录目前的优点、限制以及值得继续探索的地方。"
    }
  ]
};

export const fallbackForums: ForumsResponse = {
  fName: "绿虎论坛",
  fIndex: [],
  topicList: null,
  __fallback: true,
  childForum: [
    { id: 139, name: "电脑", newTopic: fallbackHome.newTopicList.slice(0, 2) },
    {
      id: 212,
      name: "软件开发",
      newTopic: fallbackHome.newTopicList.slice(2, 4)
    },
    {
      id: 142,
      name: "人工智能",
      newTopic: fallbackHome.newTopicList.slice(1, 3)
    },
    {
      id: 206,
      name: "移动设备",
      newTopic: fallbackHome.newTopicList.slice(1, 2)
    },
    { id: 47, name: "建站", newTopic: fallbackHome.newTopicList.slice(2, 3) },
    { id: 199, name: "公告", newTopic: fallbackHome.newTopicList.slice(0, 1) }
  ]
};

export const fallbackTopic: TopicResponse = {
  fName: "社区设计",
  fIndex: [
    { id: 0, name: "绿虎论坛" },
    { id: 212, name: "软件开发" }
  ],
  tMeta: {
    title: "欢迎来到更现代的虎绿林社区",
    read_count: 1280,
    uid: 1,
    ctime: now - 86400,
    mtime: now - 2400,
    essence: 1,
    locked: 0,
    _u_name: "老虎会游泳",
    _u_avatar: "https://file.hu60.cn/avatar/1.jpg?r=1660225893",
    _u_signature: "你好，这里是虎绿林。"
  },
  floorCount: 3,
  currPage: 1,
  maxPage: 1,
  canReply: false,
  __fallback: true,
  tContents: [
    {
      uid: 1,
      ctime: now - 86400,
      mtime: now - 7200,
      floor: 0,
      id: 1,
      topic_id: 1,
      _u_name: "老虎会游泳",
      _u_avatar: "https://file.hu60.cn/avatar/1.jpg?r=1660225893",
      _u_signature: "你好，这里是虎绿林。",
      content:
        "<div class=\"markdown-body\"><h2>社区是内容与人的共同记忆</h2><p>当前界面保留版块、楼层和长文章，同时让搜索、阅读与移动端体验更加自然。</p><pre><code>API → 数据适配层 → 现代社区界面</code></pre><p>内容服务暂时不可用时，你正在看到的是安全的离线示例。</p></div>"
    },
    {
      uid: 17189,
      ctime: now - 43000,
      mtime: now - 43000,
      floor: 1,
      id: 2,
      topic_id: 1,
      _u_name: "森森",
      _u_avatar: "/upload/default.jpg",
      content: "清晰、克制，而且还保留了论坛原来的楼层感。"
    },
    {
      uid: 22230,
      ctime: now - 22000,
      mtime: now - 22000,
      floor: 2,
      id: 3,
      topic_id: 1,
      _u_name: "hik",
      _u_avatar: "/upload/default.jpg",
      content: "移动端的阅读密度也很舒服，期待继续完善。"
    }
  ]
};

export function fallbackSearch(query: string): SearchResponse {
  const needle = query.trim().toLowerCase();
  const results = fallbackHome.newTopicList.filter((topic) => {
    const haystack = `${topic.title} ${topic._topic_summary} ${topic.forum_name}`.toLowerCase();
    return !needle || haystack.includes(needle);
  });

  return {
    success: true,
    topicCount: results.length,
    currPage: 1,
    maxPage: 1,
    topicList: results,
    __fallback: true
  };
}
