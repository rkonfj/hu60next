import {
  Activity,
  Clock3,
  Flame,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { ActiveTopicFeed } from "@/components/active-topic-feed";
import { CommunityRail } from "@/components/left-rail";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import {
  getActiveTopics,
  getDailyForumTopicCounts,
  getForums,
  getGlobalTopics
} from "@/lib/hu60";

export type ExploreTab = "latest" | "active" | "hot" | "essence";

type ExploreFeedProps = {
  activeTab: ExploreTab;
  page: number;
};

const tabs = [
  { key: "active", label: "活跃", icon: Activity },
  { key: "latest", label: "最新", icon: Clock3 },
  { key: "hot", label: "热议", icon: Flame },
  { key: "essence", label: "精华", icon: Sparkles }
] as const;

export function isExploreTab(value?: string): value is ExploreTab {
  return tabs.some(({ key }) => key === value);
}

export async function ExploreFeed({ activeTab, page }: ExploreFeedProps) {
  const feedRequest =
    activeTab === "latest" || activeTab === "essence"
      ? getGlobalTopics(page, activeTab === "essence")
      : getActiveTopics(page);
  const [feed, forums, dailyForumTopics] = await Promise.all([
    feedRequest,
    getForums(),
    getDailyForumTopicCounts()
  ]);
  const isHomeFeed = "newTopicList" in feed;
  const topics = [
    ...(isHomeFeed ? feed.newTopicList : (feed.topicList ?? []))
  ];
  const currentPage = feed.currPage ?? page;
  const maxPage = isHomeFeed ? undefined : (feed.maxPage ?? page);
  const hasNextPage = isHomeFeed
    ? feed.hasNextPage
    : currentPage < (maxPage ?? currentPage);
  const initialSessionUpdate = isHomeFeed
    ? {
        newMsg: Number(feed._myself?.newMsg || 0),
        newAtInfo: Number(feed._myself?.newAtInfo || 0),
        countReview: Number(feed._myself?.countReview || 0),
        chatCountReview: Number(feed._myself?.chatCountReview || 0)
      }
    : {
        newMsg: 0,
        newAtInfo: 0,
        countReview: 0,
        chatCountReview: 0
      };

  if (activeTab === "hot") {
    topics.sort(
      (a, b) =>
        b.reply_count * 8 +
        b.read_count / 100 -
        (a.reply_count * 8 + a.read_count / 100)
    );
  }

  return (
    <main className="page-shell home-grid">
      <section className="feed-column">
        {feed.__fallback && (
          <div className="data-notice">
            暂时无法获取社区内容，请稍后刷新重试。
          </div>
        )}

        <div className="feed-toolbar">
          <div className="feed-tabs" role="tablist" aria-label="内容排序">
            {tabs.map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                href={`/explore/${key}`}
                className={activeTab === key ? "active" : ""}
                role="tab"
                aria-selected={activeTab === key}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
          <Pagination
            current={currentPage}
            max={maxPage}
            hasNext={hasNextPage}
            path={`/explore/${activeTab}`}
            className="feed-pagination-top"
            previousPageTarget="last-topic"
            nextPageTarget="first-topic"
          />
        </div>

        {activeTab === "active" ? (
          <ActiveTopicFeed
            key={page}
            initialTopics={topics}
            initialNow={feed._time}
            initialSessionUpdate={initialSessionUpdate}
            page={page}
          />
        ) : (
          <div className="topic-list">
            {topics.map((topic, index) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                now={feed._time}
                pageFirst={index === 0}
                pageLast={index === topics.length - 1}
              />
            ))}
          </div>
        )}

        {feed.__fallback && !topics.length ? (
          <div className="empty-state">
            <Activity size={28} />
            <h2>内容暂时不可用</h2>
            <p>没有使用离线帖子或示例数据代替真实内容。</p>
          </div>
        ) : null}

        <Pagination
          current={currentPage}
          max={maxPage}
          hasNext={hasNextPage}
          path={`/explore/${activeTab}`}
          previousPageTarget="last-topic"
          nextPageTarget="first-topic"
        />
      </section>
      <CommunityRail
        forums={forums.childForum}
        dailyTopicCounts={dailyForumTopics.counts}
      />
    </main>
  );
}
