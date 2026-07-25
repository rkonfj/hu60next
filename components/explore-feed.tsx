import { Activity, ArrowRight, Clock3, Flame } from "lucide-react";
import Link from "next/link";
import { LeftRail } from "@/components/left-rail";
import { TopicCard } from "@/components/topic-card";
import { getForums, getHome } from "@/lib/hu60";

export type ExploreTab = "latest" | "active" | "hot";

type ExploreFeedProps = {
  activeTab: ExploreTab;
  page: number;
};

const tabs = [
  { key: "latest", label: "最新", icon: Clock3 },
  { key: "active", label: "活跃", icon: Activity },
  { key: "hot", label: "热议", icon: Flame }
] as const;

export function isExploreTab(value?: string): value is ExploreTab {
  return tabs.some(({ key }) => key === value);
}

export async function ExploreFeed({ activeTab, page }: ExploreFeedProps) {
  const [home, forums] = await Promise.all([getHome(page), getForums()]);
  const topics = [...home.newTopicList];

  if (activeTab === "active") {
    topics.sort((a, b) => b.mtime - a.mtime);
  } else if (activeTab === "hot") {
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
        {home.__fallback && (
          <div className="data-notice">
            当前无法连接原站，正在展示离线示例；连接恢复后会自动显示实时内容。
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
            <TopicCard key={topic.id} topic={topic} now={home._time} />
          ))}
        </div>

        <div className="feed-pager">
          {page > 1 && (
            <Link href={`/explore/${activeTab}?page=${page - 1}`}>
              上一页
            </Link>
          )}
          <span>第 {page} 页</span>
          {home.hasNextPage && (
            <Link href={`/explore/${activeTab}?page=${page + 1}`}>
              查看更多 <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
