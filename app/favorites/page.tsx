import { Bookmark, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import { getFavoriteTopics, getUserStatus } from "@/lib/hu60";

export const metadata: Metadata = { title: "我的收藏" };

type FavoritesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function FavoritesPage({
  searchParams
}: FavoritesPageProps) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const status = await getUserStatus(sid);

  if (!status.uid || status.isLogin !== true) {
    return (
      <main className="page-shell narrow-page content-page">
        <div className="empty-state locked-state">
          <LockKeyhole size={30} />
          <h1>登录后查看收藏</h1>
          <p>收藏的主题只会对当前账号显示。</p>
          <Link href="/login?next=/favorites">前往登录</Link>
        </div>
      </main>
    );
  }

  const data = await getFavoriteTopics(page, sid);

  return (
    <main className="page-shell content-page favorites-page">
      <header className="list-page-heading">
        <div>
          <span className="eyebrow">
            <Bookmark size={14} />
            <span data-member-uid={status.uid}>{status.name}</span>
          </span>
          <h1>我的收藏</h1>
        </div>
        <span>{data.topicCount} 个主题</span>
      </header>

      {data.__fallback ? (
        <div className="data-notice">暂时无法读取收藏，请稍后刷新。</div>
      ) : null}

      <div className="topic-list">
        {data.topicList.map((topic, index) => (
          <TopicCard
            key={`${topic.id}-${topic.content_id ?? topic.topic_id}`}
            topic={topic}
            now={data._time}
            pageFirst={index === 0}
            pageLast={index === data.topicList.length - 1}
          />
        ))}
      </div>

      {!data.topicList.length && !data.__fallback ? (
        <div className="empty-state">
          <Bookmark size={28} />
          <h2>还没有收藏主题</h2>
          <p>在主题详情页点击“加入收藏”，之后可以从这里找到。</p>
        </div>
      ) : null}

      <Pagination
        current={data.currPage}
        max={data.maxPage}
        path="/favorites"
        previousPageTarget="last-topic"
        nextPageTarget="first-topic"
      />
    </main>
  );
}
