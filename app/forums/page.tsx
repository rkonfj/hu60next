import {
  ArrowRight,
  FolderOpen,
  LayoutGrid,
  MessageSquareText
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TopicCard } from "@/components/topic-card";
import { getForums } from "@/lib/hu60";

export const metadata: Metadata = { title: "社区版块" };

export default async function ForumsPage() {
  const forums = await getForums();

  return (
    <main className="page-shell content-page">
      <header className="page-heading">
        <span className="eyebrow">
          <LayoutGrid size={14} />
          找到你的同好
        </span>
        <h1>社区版块</h1>
        <p>从操作系统到人工智能，沿着你感兴趣的方向进入讨论。</p>
      </header>

      {forums.__fallback && (
        <div className="data-notice">暂时使用离线版块数据。</div>
      )}

      <div className="forum-grid">
        {forums.childForum.map((forum, index) => (
          <section className="forum-card" key={forum.id}>
            <div className={`forum-card-icon color-${(index % 5) + 1}`}>
              <FolderOpen size={22} />
            </div>
            <div className="forum-card-head">
              <div>
                <h2>{forum.name}</h2>
                <p>
                  <MessageSquareText size={14} />
                  {forum.newTopic?.length ?? 0} 条近期讨论
                </p>
              </div>
              <Link href={`/forum/${forum.id}`} aria-label={`进入${forum.name}`}>
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="forum-preview">
              {(forum.newTopic ?? []).slice(0, 3).map((topic) => (
                <TopicCard key={topic.id} topic={topic} compact />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
