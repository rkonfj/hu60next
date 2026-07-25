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

  return (
    <main className="page-shell narrow-page">
      <nav className="breadcrumbs" aria-label="面包屑">
        <Link href="/forums">社区版块</Link>
        <ChevronRight size={14} />
        <span>{forum.fName}</span>
      </nav>
      <header className="forum-heading">
        <div className="forum-heading-icon">
          <FolderOpen size={26} />
        </div>
        <div>
          <span className="eyebrow">
            <Layers3 size={14} />
            主题版块
          </span>
          <h1>{forum.fName}</h1>
          <p>这里收录该版块近期发布和回复的内容。</p>
        </div>
      </header>

      {forum.childForum.length > 0 && (
        <div className="subforum-row">
          {forum.childForum.map((child) => (
            <Link href={`/forum/${child.id}`} key={child.id}>
              {child.name}
              <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      )}

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
    </main>
  );
}
