import { Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import { searchTopics } from "@/lib/hu60";

export const metadata: Metadata = { title: "搜索社区" };

type SearchPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const result = query ? await searchTopics(query, page) : null;

  return (
    <main className="page-shell narrow-page search-page">
      <header className="page-heading">
        <span className="eyebrow">
          <Search size={14} />
          全站检索
        </span>
        <h1>搜索社区</h1>
      </header>

      {result?.__fallback ? (
        <div className="data-notice">
          暂时无法完成搜索，请稍后刷新重试。
        </div>
      ) : null}

      {result && !result.__fallback && (
        <div className="search-summary">
          <span>
            “{query}” 找到 <strong>{result.topicCount}</strong> 条讨论
          </span>
          <small>第 {result.currPage} 页</small>
        </div>
      )}

      <div className="topic-list">
        {result?.topicList.map((topic, index) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            pageFirst={index === 0}
            pageLast={index === result.topicList.length - 1}
          />
        ))}
      </div>

      {result && !result.__fallback && !result.topicList.length && (
        <div className="empty-state">
          <SearchX size={30} />
          <h2>没有找到相关讨论</h2>
          <p>换一个更短的关键词，或者尝试搜索具体的软件和设备名称。</p>
        </div>
      )}

      {result && !result.__fallback && (
        <Pagination
          current={result.currPage}
          max={result.maxPage}
          path="/search"
          query={{ q: query }}
          previousPageTarget="last-topic"
          nextPageTarget="first-topic"
        />
      )}
    </main>
  );
}
