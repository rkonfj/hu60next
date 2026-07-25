import {
  Activity,
  Clock3,
  Flame,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { LeftRail } from "@/components/left-rail";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import {
  getActiveTopics,
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
  const [feed, forums] = await Promise.all([feedRequest, getForums()]);
  const isHomeFeed = "newTopicList" in feed;
  const topics = [
    ...(isHomeFeed ? feed.newTopicList : (feed.topicList ?? []))
  ];
  const currentPage = feed.currPage ?? page;
  const maxPage = isHomeFeed ? undefined : (feed.maxPage ?? page);
  const hasNextPage = isHomeFeed
    ? feed.hasNextPage
    : currentPage < (maxPage ?? currentPage);

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
          <Pagination
            current={currentPage}
            max={maxPage}
            hasNext={hasNextPage}
            path={`/explore/${activeTab}`}
            className="feed-pagination-top"
          />
        </div>

        <div className="topic-list">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} now={feed._time} />
          ))}
        </div>

        <Pagination
          current={currentPage}
          max={maxPage}
          hasNext={hasNextPage}
          path={`/explore/${activeTab}`}
        />
      </section>
    </main>
  );
}
