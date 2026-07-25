import {
  Activity,
  ArrowRight,
  Clock3,
  Flame,
  MessageCircleMore,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { LeftRail } from "@/components/left-rail";
import { RightRail } from "@/components/right-rail";
import { TopicCard } from "@/components/topic-card";
import { getForums, getHome } from "@/lib/hu60";

type HomeProps = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

const tabs = [
  { key: "latest", label: "最新", icon: Clock3 },
  { key: "active", label: "活跃", icon: Activity },
  { key: "hot", label: "热议", icon: Flame }
];

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const activeTab = ["latest", "active", "hot"].includes(query.tab ?? "")
    ? query.tab!
    : "latest";
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
        <div className="welcome-panel">
          <div className="welcome-copy">
            <span className="eyebrow">
              <Sparkles size={14} />
              技术在这里持续生长
            </span>
            <h1>
              分享你真正
              <br />
              <em>踩过的坑</em>
            </h1>
            <p>
              一个关于软件、设备与创造的中文社区。认真提问，也认真留下答案。
            </p>
            <div className="welcome-actions">
              <Link href="/compose" className="primary-action">
                发起讨论 <ArrowRight size={16} />
              </Link>
              <Link href="/forums" className="secondary-action">
                探索版块
              </Link>
            </div>
          </div>
          <div className="welcome-visual" aria-hidden="true">
            <span className="visual-ring ring-one" />
            <span className="visual-ring ring-two" />
            <span className="visual-bubble bubble-main">
              <MessageCircleMore size={33} />
            </span>
            <span className="visual-bubble bubble-small">
              <Flame size={18} />
            </span>
            <div className="visual-lines">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>

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
                href={`/?tab=${key}`}
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
            <Link href={`/?tab=${activeTab}&page=${page - 1}`}>上一页</Link>
          )}
          <span>第 {page} 页</span>
          {home.hasNextPage && (
            <Link href={`/?tab=${activeTab}&page=${page + 1}`}>
              查看更多 <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
      <RightRail topics={home.newTopicList} />
    </main>
  );
}
