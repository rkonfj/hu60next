"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function HeaderSearch() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return (
    <form className="header-search" action="/search" method="get">
      <Search size={17} aria-hidden="true" />
      <input
        key={query}
        type="search"
        name="q"
        defaultValue={query}
        placeholder="搜索帖子、作者或技术关键词"
        aria-label="搜索社区"
      />
      <kbd>Enter</kbd>
    </form>
  );
}
