import { ChevronRight, FolderOpen, Layers3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import { getForum } from "@/lib/hu60";

type ForumPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params
}: ForumPageProps): Promise<Metadata> {
  const { id } = await params;
  const forum = await getForum(Number(id));
  return { title: forum.fName };
}

export default async function ForumPage({
  params,
  searchParams
}: ForumPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const forumId = Number(id);
  const page = Math.max(1, Number(query.page) || 1);
  const forum = await getForum(forumId, page);
  const topics =
    forum.topicList ??
    forum.childForum.flatMap((child) => child.newTopic ?? []);
  const currentForum = forum.fIndex.find((item) => item.id === forumId);
  const parentForum =
    currentForum?.parent_id && currentForum.parent_id > 0
      ? forum.fIndex.find((item) => item.id === currentForum.parent_id)
      : undefined;

  return (
    <main className="page-shell content-page forum-page">
      <div className="forum-layout">
        <section className="forum-topic-column">
          <div className="topic-list">
            {topics.map((topic) => (
              <TopicCard key={`${topic.id}-${topic.forum_id}`} topic={topic} />
            ))}
          </div>

          {!topics.length && (
            <div className="empty-state">
              <FolderOpen size={28} />
              <h2>这个版块暂时没有可展示的讨论</h2>
              <p>可以返回全部版块，继续探索其他内容。</p>
              <Link href="/forums">查看全部版块</Link>
            </div>
          )}

          <Pagination
            current={forum.currPage ?? page}
            max={forum.maxPage ?? page}
            path={`/forum/${forumId}`}
          />
        </section>

        <aside className="forum-sidebar">
          <header className="forum-heading">
            <div className="forum-heading-icon">
              <FolderOpen size={26} />
            </div>
            <div>
              <span className="eyebrow">
                <Layers3 size={14} />
                主题板块
                {parentForum && (
                  <>
                    <span className="forum-parent-separator" aria-hidden="true">
                      /
                    </span>
                    <Link
                      className="forum-parent-link"
                      href={`/forum/${parentForum.id}`}
                      aria-label={`返回上级板块：${parentForum.name}`}
                    >
                      上级：{parentForum.name}
                    </Link>
                  </>
                )}
              </span>
              <h1>{forum.fName}</h1>
              <p>这里收录该版块近期发布和回复的内容。</p>
            </div>
          </header>

          {forum.childForum.length > 0 && (
            <section className="subforum-panel">
              <strong>子板块</strong>
              <div className="subforum-row">
                {forum.childForum.map((child) => (
                  <Link href={`/forum/${child.id}`} key={child.id}>
                    {child.name}
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
