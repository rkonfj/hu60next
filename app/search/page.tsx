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
        <form className="large-search" action="/search" method="get">
          <Search size={20} />
          <input
            autoFocus
            type="search"
            name="q"
            defaultValue={query}
            placeholder="输入帖子标题、内容或作者"
          />
          <button type="submit">搜索</button>
        </form>
      </header>

      {result && (
        <div className="search-summary">
          <span>
            “{query}” 找到 <strong>{result.topicCount}</strong> 条讨论
          </span>
          <small>第 {result.currPage} 页</small>
        </div>
      )}

      <div className="topic-list">
        {result?.topicList.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>

      {result && !result.topicList.length && (
        <div className="empty-state">
          <SearchX size={30} />
          <h2>没有找到相关讨论</h2>
          <p>换一个更短的关键词，或者尝试搜索具体的软件和设备名称。</p>
        </div>
      )}

      {result && (
        <Pagination
          current={result.currPage}
          max={result.maxPage}
          path="/search"
          query={{ q: query }}
        />
      )}
    </main>
  );
}
