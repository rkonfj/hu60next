import {
  Activity,
  ArrowRight,
  Clock3,
  Flame,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { LeftRail } from "@/components/left-rail";
import { TopicCard } from "@/components/topic-card";
import { getForums, getGlobalTopics, getHome } from "@/lib/hu60";

export type ExploreTab = "latest" | "active" | "hot" | "essence";

type ExploreFeedProps = {
  activeTab: ExploreTab;
  page: number;
};

const tabs = [
  { key: "latest", label: "最新", icon: Clock3 },
  { key: "active", label: "活跃", icon: Activity },
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
      : getHome(page);
  const [feed, forums] = await Promise.all([feedRequest, getForums()]);
  const isHomeFeed = "newTopicList" in feed;
  const topics = [
    ...(isHomeFeed ? feed.newTopicList : (feed.topicList ?? []))
  ];

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
        <LeftRail forums={forums.childForum} />
      <section className="feed-column">
        {feed.__fallback && (
          <div className="data-notice">
            暂时无法获取最新内容，正在展示离线示例；服务恢复后会自动刷新。
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
          <span>{topics.length} 条讨论</span>
        </div>

        <div className="topic-list">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} now={feed._time} />
          ))}
        </div>

        <div className="feed-pager">
          {page > 1 && (
            <Link href={`/explore/${activeTab}?page=${page - 1}`}>
              上一页
            </Link>
          )}
          <span>第 {page} 页</span>
          {(isHomeFeed
            ? feed.hasNextPage
            : page < (feed.maxPage ?? page)) && (
            <Link href={`/explore/${activeTab}?page=${page + 1}`}>
              查看更多 <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
