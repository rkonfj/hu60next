import { Compass, Grid2X2, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { ContextualComposeLink } from "@/components/contextual-compose-link";
import { HeaderSearch } from "@/components/header-search";
import { MobileNav } from "@/components/mobile-nav";
import { SessionMenu } from "@/components/session-menu";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="主导航">
          <Link href="/explore/active">
            <Compass size={17} />
            发现
          </Link>
          <Link href="/forums">
            <Grid2X2 size={17} />
            版块
          </Link>
        </nav>
        <Suspense
          fallback={
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
          }
        >
          <HeaderSearch />
        </Suspense>
        <div className="header-actions">
          <ContextualComposeLink />
          <SessionMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
