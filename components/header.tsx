"use client";

import { Compass, Grid2X2, PenLine, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { SessionMenu } from "@/components/session-menu";

export function Header() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="主导航">
          <Link href="/explore/latest">
            <Compass size={17} />
            发现
          </Link>
          <Link href="/forums">
            <Grid2X2 size={17} />
            版块
          </Link>
        </nav>
        <form className="header-search" action="/search" method="get">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            name="q"
            placeholder="搜索帖子、作者或技术关键词"
            aria-label="搜索社区"
          />
          <kbd>Enter</kbd>
        </form>
        <div className="header-actions">
          <Link href="/compose" className="compose-button">
            <PenLine size={17} />
            <span>发布</span>
          </Link>
          <SessionMenu />
        </div>
      </div>
    </header>
  );
}
