import {
  getWeeklyGlobalTopicsPage,
  getWeeklyReplyFeedPage,
  getWeeklyUserTopicsPage
} from "@/lib/hu60";
import type { CacheStatus } from "@/lib/cache-types";
import type {
  PersonalWeeklyReport,
  Topic,
  UserReply,
  WeeklyMvpRanking,
  WeeklyReportHighlight,
  WeeklyReportStats
} from "@/lib/types";

const DAY_SECONDS = 86_400;
const REPORT_SECONDS = DAY_SECONDS * 7;
const SOURCE_SECONDS = REPORT_SECONDS * 2;
const SOURCE_CACHE_MS = 15 * 60 * 1000;
const REPORT_CACHE_MS = 15 * 60 * 1000;
const MVP_CACHE_MS = 60 * 60 * 1000;
const PAGE_SIZE = 500;
const MAX_REPLY_PAGES = 4;
const MAX_TOPIC_PAGES = 2;
const MAX_GLOBAL_TOPIC_PAGES = 2;
const SHANGHAI_OFFSET_SECONDS = 8 * 60 * 60;

type ReplySource = {
  replies: UserReply[];
  now: number;
  partial: boolean;
  fallback: boolean;
};

type TopicSource = {
  topics: Topic[];
  partial: boolean;
  fallback: boolean;
};

let replySourceMemoryCache:
  | {
      expiresAt: number;
      value: ReplySource;
    }
  | undefined;
let replySourceBuildPromise: Promise<ReplySource> | undefined;
let globalTopicSourceMemoryCache:
  | {
      expiresAt: number;
      value: TopicSource;
    }
  | undefined;
let globalTopicSourceBuildPromise: Promise<TopicSource> | undefined;
let mvpMemoryCache:
  | {
      expiresAt: number;
      value: WeeklyMvpRanking;
    }
  | undefined;
let mvpBuildPromise: Promise<WeeklyMvpRanking> | undefined;

const reportMemoryCache = new Map<
  string,
  {
    expiresAt: number;
    value: PersonalWeeklyReport;
    uid: number;
    username: string;
  }
>();
const reportBuildPromises = new Map<
  string,
  Promise<PersonalWeeklyReport>
>();

function emptyStats(): WeeklyReportStats {
  return {
    topicsCreated: 0,
    repliesMade: 0,
    repliesReceived: 0,
    discussionsJoined: 0,
    peopleInteracted: 0,
    firstReplies: 0,
    continuedDiscussions: 0,
    activeDays: 0,
    forumsVisited: 0
  };
}

function fallbackReport(uid: number, now: number): PersonalWeeklyReport {
  return {
    uid,
    periodStart: shanghaiWeekStart(now),
    periodEnd: now,
    updatedAt: now,
    current: emptyStats(),
    previous: emptyStats(),
    highlights: [],
    __fallback: true
  };
}

function inPeriod(timestamp: number, start: number, end: number) {
  return timestamp >= start && timestamp < end;
}

function shanghaiDateKey(timestamp: number) {
  return new Date(
    (timestamp + SHANGHAI_OFFSET_SECONDS) * 1000
  )
    .toISOString()
    .slice(0, 10);
}

function shanghaiWeekStart(timestamp: number) {
  const shiftedTimestamp = timestamp + SHANGHAI_OFFSET_SECONDS;
  const dayStart =
    Math.floor(shiftedTimestamp / DAY_SECONDS) * DAY_SECONDS;
  const weekday = new Date(shiftedTimestamp * 1000).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;

  return (
    dayStart -
    daysSinceMonday * DAY_SECONDS -
    SHANGHAI_OFFSET_SECONDS
  );
}

async function buildReplySource(): Promise<ReplySource> {
  let now = Math.floor(Date.now() / 1000);
  let partial = false;
  const replies = new Map<number, UserReply>();

  for (let page = 1; page <= MAX_REPLY_PAGES; page += 1) {
    const response = await getWeeklyReplyFeedPage(page, PAGE_SIZE);
    if (response.__fallback) {
      return { replies: [], now, partial: false, fallback: true };
    }

    if (response._time) now = Number(response._time) || now;
    const cutoff = now - SOURCE_SECONDS;
    const pageReplies = Array.isArray(response.replyList)
      ? response.replyList
      : [];

    for (const reply of pageReplies) {
      const createdAt = Number(reply.ctime) || 0;
      if (createdAt >= cutoff) replies.set(reply.id, reply);
    }

    const oldestSortTime = pageReplies.reduce(
      (oldest, reply) =>
        Math.min(oldest, Number(reply.mtime || reply.ctime) || oldest),
      Number.POSITIVE_INFINITY
    );
    const reachedBoundary =
      Number.isFinite(oldestSortTime) && oldestSortTime < cutoff;
    const reachedLastPage =
      page >= Math.max(1, Number(response.maxPage) || 1);

    if (
      reachedBoundary ||
      reachedLastPage ||
      pageReplies.length < PAGE_SIZE
    ) {
      break;
    }

    if (page === MAX_REPLY_PAGES) partial = true;
  }

  return {
    replies: Array.from(replies.values()),
    now,
    partial,
    fallback: false
  };
}

async function getReplySource(): Promise<ReplySource> {
  const now = Date.now();
  if (
    replySourceMemoryCache &&
    replySourceMemoryCache.expiresAt > now
  ) {
    return replySourceMemoryCache.value;
  }

  if (!replySourceBuildPromise) {
    replySourceBuildPromise = buildReplySource();
  }

  try {
    const source = await replySourceBuildPromise;
    if (!source.fallback) {
      replySourceMemoryCache = {
        expiresAt: Date.now() + SOURCE_CACHE_MS,
        value: source
      };
    }
    return source;
  } finally {
    replySourceBuildPromise = undefined;
  }
}

async function buildGlobalTopicSource(
  cutoff: number
): Promise<TopicSource> {
  const topics = new Map<number, Topic>();
  let partial = false;

  for (let page = 1; page <= MAX_GLOBAL_TOPIC_PAGES; page += 1) {
    const response = await getWeeklyGlobalTopicsPage(page, PAGE_SIZE);
    if (response.__fallback) {
      return { topics: [], partial: false, fallback: true };
    }

    const pageTopics = Array.isArray(response.topicList)
      ? response.topicList
      : [];
    for (const topic of pageTopics) {
      if ((Number(topic.ctime) || 0) >= cutoff) {
        topics.set(topic.id || topic.topic_id, topic);
      }
    }

    const regularTopicTimes = pageTopics
      .filter((topic) => Number(topic.level || 0) === 0)
      .map((topic) => Number(topic.mtime || topic.ctime) || 0);
    const reachedBoundary =
      regularTopicTimes.length > 0 &&
      Math.min(...regularTopicTimes) < cutoff;
    const reachedLastPage =
      page >= Math.max(1, Number(response.maxPage) || 1);

    if (
      reachedBoundary ||
      reachedLastPage ||
      pageTopics.length < PAGE_SIZE
    ) {
      break;
    }
    if (page === MAX_GLOBAL_TOPIC_PAGES) partial = true;
  }

  return {
    topics: Array.from(topics.values()),
    partial,
    fallback: false
  };
}

async function getGlobalTopicSource(cutoff: number) {
  const now = Date.now();
  if (
    globalTopicSourceMemoryCache &&
    globalTopicSourceMemoryCache.expiresAt > now
  ) {
    return globalTopicSourceMemoryCache.value;
  }

  if (!globalTopicSourceBuildPromise) {
    globalTopicSourceBuildPromise = buildGlobalTopicSource(cutoff);
  }

  try {
    const source = await globalTopicSourceBuildPromise;
    if (!source.fallback) {
      globalTopicSourceMemoryCache = {
        expiresAt: Date.now() + SOURCE_CACHE_MS,
        value: source
      };
    }
    return source;
  } finally {
    globalTopicSourceBuildPromise = undefined;
  }
}

async function buildUserTopicSource(
  username: string,
  cutoff: number
): Promise<TopicSource> {
  const topics = new Map<number, Topic>();
  let partial = false;

  for (let page = 1; page <= MAX_TOPIC_PAGES; page += 1) {
    const response = await getWeeklyUserTopicsPage(
      username,
      page,
      PAGE_SIZE
    );
    if (response.__fallback) {
      return { topics: [], partial: false, fallback: true };
    }

    const pageTopics = Array.isArray(response.topicList)
      ? response.topicList
      : [];
    for (const topic of pageTopics) {
      if ((Number(topic.ctime) || 0) >= cutoff) {
        topics.set(topic.id || topic.topic_id, topic);
      }
    }

    const reachedLastPage =
      page >= Math.max(1, Number(response.maxPage) || 1);
    if (reachedLastPage || pageTopics.length < PAGE_SIZE) break;
    if (page === MAX_TOPIC_PAGES) partial = true;
  }

  return {
    topics: Array.from(topics.values()),
    partial,
    fallback: false
  };
}

export function weeklyMvpBreakdown(stats: WeeklyReportStats) {
  return [
    {
      key: "firstReplies",
      label: "破冰回复",
      description: "作为主题的第一条回复，帮助新讨论获得回应",
      value: stats.firstReplies,
      weight: 5,
      points: stats.firstReplies * 5
    },
    {
      key: "continuedDiscussions",
      label: "带动讨论延续",
      description: "参与之后，仍有其他会员继续回复的讨论",
      value: stats.continuedDiscussions,
      weight: 4,
      points: stats.continuedDiscussions * 4
    },
    {
      key: "peopleInteracted",
      label: "交流会员",
      description: "本周与其产生有效交流的不同会员人数",
      value: stats.peopleInteracted,
      weight: 3,
      points: stats.peopleInteracted * 3
    },
    {
      key: "repliesReceived",
      label: "收到交流",
      description: "主题或回复收到的其他会员回复",
      value: stats.repliesReceived,
      weight: 2,
      points: stats.repliesReceived * 2
    },
    {
      key: "discussionsJoined",
      label: "参与讨论",
      description: "本周发帖或回复过的不同主题数",
      value: stats.discussionsJoined,
      weight: 2,
      points: stats.discussionsJoined * 2
    },
    {
      key: "activeDays",
      label: "活跃天数",
      description: "本周产生发帖或回复行为的自然日数量",
      value: stats.activeDays,
      weight: 2,
      points: stats.activeDays * 2
    },
    {
      key: "topicsCreated",
      label: "创建主题",
      description: "每个主题计1分，本项最多计5分",
      value: stats.topicsCreated,
      weight: 1,
      cap: 5,
      points: Math.min(stats.topicsCreated, 5)
    }
  ] as const;
}

export function weeklyMvpScore(stats: WeeklyReportStats) {
  return weeklyMvpBreakdown(stats).reduce(
    (total, item) => total + item.points,
    0
  );
}

function rankMvpMembers(
  replySource: ReplySource,
  topicSource: TopicSource,
  periodStart: number,
  periodEnd: number,
  limit: number
) {
  const periodReplies = replySource.replies.filter((reply) =>
    inPeriod(Number(reply.ctime) || 0, periodStart, periodEnd)
  );
  const periodTopics = topicSource.topics.filter((topic) =>
    inPeriod(Number(topic.ctime) || 0, periodStart, periodEnd)
  );
  const replyById = new Map(
    replySource.replies.map((reply) => [reply.id, reply])
  );
  const candidates = new Set<number>();
  const memberInfo = new Map<
    number,
    { name: string; avatar?: string | null }
  >();

  for (const topic of periodTopics) {
    if (topic.uid <= 0) continue;
    candidates.add(topic.uid);
    memberInfo.set(topic.uid, {
      name:
        topic._u_name || topic.uinfo?.name || `用户 ${topic.uid}`,
      avatar: topic._u_avatar
    });
  }

  for (const reply of periodReplies) {
    if (reply.uid > 0) {
      candidates.add(reply.uid);
      memberInfo.set(reply.uid, {
        name: reply._u_name || reply.uinfo?.name || `用户 ${reply.uid}`,
        avatar: reply._u_avatar
      });
    }
    if (reply.topic?.uid > 0 && !memberInfo.has(reply.topic.uid)) {
      candidates.add(reply.topic.uid);
      memberInfo.set(reply.topic.uid, {
        name: reply.topic._u_name || `用户 ${reply.topic.uid}`,
        avatar: reply.topic._u_avatar
      });
    }
  }

  return Array.from(candidates)
    .map((uid) => {
      const stats = buildPeriodStats(
        uid,
        topicSource.topics,
        replySource.replies,
        replyById,
        periodStart,
        periodEnd
      );
      const score = weeklyMvpScore(stats);
      const info = memberInfo.get(uid);

      return {
        uid,
        name: info?.name || `用户 ${uid}`,
        avatar: info?.avatar,
        weeklyScore: score,
        weeklySummary: `${stats.peopleInteracted} 人交流 · ${stats.continuedDiscussions} 场延续`,
        stats
      };
    })
    .filter((member) => member.weeklyScore > 0)
    .sort(
      (left, right) =>
        right.weeklyScore - left.weeklyScore ||
        right.stats.peopleInteracted - left.stats.peopleInteracted ||
        right.stats.continuedDiscussions -
          left.stats.continuedDiscussions ||
        right.stats.activeDays - left.stats.activeDays ||
        left.uid - right.uid
    )
    .slice(0, limit)
    .map(({ stats: _stats, ...member }) => member);
}

async function buildWeeklyMvpRanking(): Promise<WeeklyMvpRanking> {
  const replySource = await getReplySource();
  if (replySource.fallback) {
    return {
      members: [],
      updatedAt: replySource.now,
      __fallback: true
    };
  }

  const periodEnd = shanghaiWeekStart(replySource.now);
  const periodStart = periodEnd - REPORT_SECONDS;
  const topicSource = await getGlobalTopicSource(periodStart);
  if (topicSource.fallback) {
    return {
      members: [],
      updatedAt: periodEnd,
      __fallback: true
    };
  }

  return {
    members: rankMvpMembers(
      replySource,
      topicSource,
      periodStart,
      periodEnd,
      5
    ),
    updatedAt: periodEnd,
    partial: replySource.partial || topicSource.partial
  };
}

export async function getWeeklyMvpRanking(): Promise<WeeklyMvpRanking> {
  const now = Date.now();
  if (mvpMemoryCache && mvpMemoryCache.expiresAt > now) {
    return mvpMemoryCache.value;
  }

  if (!mvpBuildPromise) {
    mvpBuildPromise = buildWeeklyMvpRanking();
  }

  try {
    const ranking = await mvpBuildPromise;
    if (!ranking.__fallback) {
      mvpMemoryCache = {
        expiresAt: Date.now() + MVP_CACHE_MS,
        value: ranking
      };
    }
    return ranking;
  } finally {
    mvpBuildPromise = undefined;
  }
}

export async function getCurrentWeeklyMvpRanking(): Promise<WeeklyMvpRanking> {
  const replySource = await getReplySource();
  if (replySource.fallback) {
    return {
      members: [],
      updatedAt: replySource.now,
      __fallback: true
    };
  }

  const periodStart = shanghaiWeekStart(replySource.now);
  const topicSource = await getGlobalTopicSource(
    periodStart - REPORT_SECONDS
  );
  if (topicSource.fallback) {
    return {
      members: [],
      updatedAt: replySource.now,
      __fallback: true
    };
  }

  return {
    members: rankMvpMembers(
      replySource,
      topicSource,
      periodStart,
      replySource.now + 1,
      10
    ),
    updatedAt: replySource.now,
    partial: replySource.partial || topicSource.partial
  };
}

function buildPeriodStats(
  uid: number,
  topics: Topic[],
  replies: UserReply[],
  replyById: Map<number, UserReply>,
  start: number,
  end: number
): WeeklyReportStats {
  const myTopics = topics.filter(
    (topic) =>
      topic.uid === uid &&
      inPeriod(Number(topic.ctime) || 0, start, end)
  );
  const periodReplies = replies.filter((reply) =>
    inPeriod(Number(reply.ctime) || 0, start, end)
  );
  const myReplies = periodReplies.filter((reply) => reply.uid === uid);
  const allMyReplyIds = new Set(
    replies.filter((reply) => reply.uid === uid).map((reply) => reply.id)
  );
  const receivedReplies = periodReplies.filter((reply) => {
    if (reply.uid === uid || reply.uid <= 0) return false;
    return (
      reply.topic?.uid === uid ||
      allMyReplyIds.has(Number(reply.reply_id) || 0)
    );
  });
  const people = new Set<number>();
  const activeDays = new Set<string>();
  const forums = new Set<number>();

  for (const topic of myTopics) {
    activeDays.add(shanghaiDateKey(topic.ctime));
    if (topic.forum_id) forums.add(topic.forum_id);
  }

  for (const reply of myReplies) {
    activeDays.add(shanghaiDateKey(reply.ctime));
    if (reply.topic?.forum_id) forums.add(reply.topic.forum_id);

    const directTarget = replyById.get(Number(reply.reply_id) || 0);
    const targetUid =
      directTarget?.uid && directTarget.uid !== uid
        ? directTarget.uid
        : reply.topic?.uid;
    if (targetUid > 0 && targetUid !== uid) people.add(targetUid);
  }

  for (const reply of receivedReplies) {
    people.add(reply.uid);
  }

  const firstUserActivity = new Map<number, number>();
  for (const topic of myTopics) {
    firstUserActivity.set(topic.id || topic.topic_id, topic.ctime);
  }
  for (const reply of myReplies) {
    const current = firstUserActivity.get(reply.topic_id);
    firstUserActivity.set(
      reply.topic_id,
      Math.min(current ?? reply.ctime, reply.ctime)
    );
  }

  const continuedTopics = new Set<number>();
  for (const reply of periodReplies) {
    if (reply.uid === uid || reply.uid <= 0) continue;
    const userActivityAt = firstUserActivity.get(reply.topic_id);
    if (userActivityAt !== undefined && reply.ctime > userActivityAt) {
      continuedTopics.add(reply.topic_id);
    }
  }

  const joinedTopics = new Set<number>(
    myTopics.map((topic) => topic.id || topic.topic_id)
  );
  for (const reply of myReplies) joinedTopics.add(reply.topic_id);

  return {
    topicsCreated: myTopics.length,
    repliesMade: myReplies.length,
    repliesReceived: receivedReplies.length,
    discussionsJoined: joinedTopics.size,
    peopleInteracted: people.size,
    firstReplies: myReplies.filter((reply) => reply.floor === 1).length,
    continuedDiscussions: continuedTopics.size,
    activeDays: activeDays.size,
    forumsVisited: forums.size
  };
}

function buildHighlights(
  uid: number,
  topics: Topic[],
  replies: UserReply[],
  replyById: Map<number, UserReply>,
  start: number,
  end: number
): WeeklyReportHighlight[] {
  const periodTopics = topics.filter(
    (topic) =>
      topic.uid === uid &&
      inPeriod(Number(topic.ctime) || 0, start, end)
  );
  const periodReplies = replies.filter((reply) =>
    inPeriod(Number(reply.ctime) || 0, start, end)
  );
  const myReplyIds = new Set(
    replies.filter((reply) => reply.uid === uid).map((reply) => reply.id)
  );
  const involvedTopicIds = new Set<number>(
    periodTopics.map((topic) => topic.id || topic.topic_id)
  );

  for (const reply of periodReplies) {
    const directTarget = replyById.get(Number(reply.reply_id) || 0);
    if (
      reply.uid === uid ||
      reply.topic?.uid === uid ||
      directTarget?.uid === uid ||
      myReplyIds.has(Number(reply.reply_id) || 0)
    ) {
      involvedTopicIds.add(reply.topic_id);
    }
  }

  const topicLookup = new Map<
    number,
    {
      title: string;
      forumId: number;
      participants: Set<number>;
      activityCount: number;
      latestAt: number;
    }
  >();

  for (const topic of periodTopics) {
    topicLookup.set(topic.id || topic.topic_id, {
      title: topic.title,
      forumId: topic.forum_id,
      participants: new Set(),
      activityCount: 0,
      latestAt: topic.ctime
    });
  }

  for (const reply of periodReplies) {
    if (!involvedTopicIds.has(reply.topic_id)) continue;
    const current = topicLookup.get(reply.topic_id) ?? {
      title: reply.topic?.title || `主题 ${reply.topic_id}`,
      forumId: reply.topic?.forum_id || 0,
      participants: new Set<number>(),
      activityCount: 0,
      latestAt: 0
    };

    if (reply.uid > 0 && reply.uid !== uid) {
      current.participants.add(reply.uid);
    }
    if (reply.topic?.uid > 0 && reply.topic.uid !== uid) {
      current.participants.add(reply.topic.uid);
    }
    current.activityCount += 1;
    current.latestAt = Math.max(current.latestAt, reply.ctime);
    topicLookup.set(reply.topic_id, current);
  }

  return Array.from(topicLookup.entries())
    .map(([topicId, item]) => ({
      topicId,
      title: item.title,
      forumId: item.forumId,
      participants: item.participants.size,
      activityCount: item.activityCount,
      latestAt: item.latestAt
    }))
    .filter((item) => item.activityCount > 0)
    .sort(
      (left, right) =>
        right.participants - left.participants ||
        right.activityCount - left.activityCount ||
        right.latestAt - left.latestAt
    )
    .slice(0, 3);
}

async function buildPersonalWeeklyReport(
  uid: number,
  username: string
): Promise<PersonalWeeklyReport> {
  const replySource = await getReplySource();
  if (replySource.fallback) {
    return fallbackReport(uid, replySource.now);
  }

  const periodEnd = replySource.now;
  const periodStart = shanghaiWeekStart(periodEnd);
  const previousStart = periodStart - REPORT_SECONDS;
  const previousEnd =
    previousStart + (periodEnd - periodStart);
  const topicSource = await buildUserTopicSource(username, previousStart);
  if (topicSource.fallback) return fallbackReport(uid, periodEnd);

  const replyById = new Map(
    replySource.replies.map((reply) => [reply.id, reply])
  );

  return {
    uid,
    periodStart,
    periodEnd,
    updatedAt: periodEnd,
    current: buildPeriodStats(
      uid,
      topicSource.topics,
      replySource.replies,
      replyById,
      periodStart,
      periodEnd
    ),
    previous: buildPeriodStats(
      uid,
      topicSource.topics,
      replySource.replies,
      replyById,
      previousStart,
      previousEnd
    ),
    highlights: buildHighlights(
      uid,
      topicSource.topics,
      replySource.replies,
      replyById,
      periodStart,
      periodEnd
    ),
    partial: replySource.partial || topicSource.partial
  };
}

export async function getPersonalWeeklyReport(
  uid: number,
  username: string
): Promise<PersonalWeeklyReport> {
  const cacheKey = `${uid}:${username}`;
  const now = Date.now();
  const cached = reportMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  let buildPromise = reportBuildPromises.get(cacheKey);
  if (!buildPromise) {
    buildPromise = buildPersonalWeeklyReport(uid, username);
    reportBuildPromises.set(cacheKey, buildPromise);
  }

  try {
    const report = await buildPromise;
    if (!report.__fallback) {
      for (const [key, entry] of reportMemoryCache) {
        if (entry.uid === uid && key !== cacheKey) {
          reportMemoryCache.delete(key);
        }
      }
      reportMemoryCache.set(cacheKey, {
        expiresAt: Date.now() + REPORT_CACHE_MS,
        value: report,
        uid,
        username
      });
    }
    return report;
  } finally {
    reportBuildPromises.delete(cacheKey);
  }
}

function weeklyCacheStatus(
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

export function getWeeklyCacheStatuses(): CacheStatus[] {
  const reportEntries = Array.from(reportMemoryCache.values());

  return [
    weeklyCacheStatus(
      "weekly-reply-source",
      "周统计回复数据源",
      "MVP和个人足迹共享的最近两周回复",
      SOURCE_CACHE_MS,
      replySourceMemoryCache,
      Boolean(replySourceBuildPromise),
      replySourceMemoryCache?.value.replies.length
    ),
    weeklyCacheStatus(
      "weekly-global-topics",
      "MVP主题数据源",
      "本周与上周MVP计算使用的全站主题",
      SOURCE_CACHE_MS,
      globalTopicSourceMemoryCache,
      Boolean(globalTopicSourceBuildPromise),
      globalTopicSourceMemoryCache?.value.topics.length
    ),
    weeklyCacheStatus(
      "weekly-mvp",
      "上周MVP排名",
      "全站前5名MVP及分数",
      MVP_CACHE_MS,
      mvpMemoryCache,
      Boolean(mvpBuildPromise),
      mvpMemoryCache?.value.members.length
    ),
    ...reportEntries.map((entry) => ({
      ...weeklyCacheStatus(
        `personal-weekly-report:${entry.uid}`,
        `个人足迹 · ${entry.username}`,
        `用户 #${entry.uid} 的个人交流统计`,
        REPORT_CACHE_MS,
        entry,
        reportBuildPromises.has(`${entry.uid}:${entry.username}`),
        1
      ),
      targetUid: entry.uid
    }))
  ];
}

async function refreshReplySourceCache() {
  if (!replySourceBuildPromise) {
    replySourceBuildPromise = buildReplySource();
  }
  try {
    const value = await replySourceBuildPromise;
    if (value.fallback) throw new Error("周统计回复数据源更新失败");
    replySourceMemoryCache = {
      expiresAt: Date.now() + SOURCE_CACHE_MS,
      value
    };
  } finally {
    replySourceBuildPromise = undefined;
  }
}

async function refreshGlobalTopicSourceCache() {
  if (!globalTopicSourceBuildPromise) {
    globalTopicSourceBuildPromise = buildGlobalTopicSource(
      Math.floor(Date.now() / 1000) - SOURCE_SECONDS
    );
  }
  try {
    const value = await globalTopicSourceBuildPromise;
    if (value.fallback) throw new Error("MVP主题数据源更新失败");
    globalTopicSourceMemoryCache = {
      expiresAt: Date.now() + SOURCE_CACHE_MS,
      value
    };
  } finally {
    globalTopicSourceBuildPromise = undefined;
  }
}

export async function refreshWeeklyCache(key: string) {
  if (key === "weekly-reply-source") {
    await refreshReplySourceCache();
    return;
  }

  if (key === "weekly-global-topics") {
    await refreshGlobalTopicSourceCache();
    return;
  }

  if (key === "weekly-mvp") {
    await refreshReplySourceCache();
    await refreshGlobalTopicSourceCache();
    if (!mvpBuildPromise) mvpBuildPromise = buildWeeklyMvpRanking();
    try {
      const value = await mvpBuildPromise;
      if (value.__fallback) throw new Error("上周MVP排名更新失败");
      mvpMemoryCache = {
        expiresAt: Date.now() + MVP_CACHE_MS,
        value
      };
      return;
    } finally {
      mvpBuildPromise = undefined;
    }
  }

  throw new Error("未知的缓存项目");
}

export async function refreshPersonalWeeklyReportCache(
  uid: number,
  username: string
) {
  const cacheKey = `${uid}:${username}`;
  let buildPromise = reportBuildPromises.get(cacheKey);
  if (!buildPromise) {
    buildPromise = buildPersonalWeeklyReport(uid, username);
    reportBuildPromises.set(cacheKey, buildPromise);
  }

  try {
    const report = await buildPromise;
    if (report.__fallback) {
      throw new Error(`用户 ${uid} 的个人足迹更新失败`);
    }
    for (const [key, entry] of reportMemoryCache) {
      if (entry.uid === uid && key !== cacheKey) {
        reportMemoryCache.delete(key);
      }
    }
    reportMemoryCache.set(cacheKey, {
      expiresAt: Date.now() + REPORT_CACHE_MS,
      value: report,
      uid,
      username
    });
  } finally {
    reportBuildPromises.delete(cacheKey);
  }
}
