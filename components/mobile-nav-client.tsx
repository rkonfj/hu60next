"use client";

import {
  Compass,
  Database,
  Grid2X2,
  LogIn,
  LogOut,
  Menu,
  PenLine,
  ShieldCheck,
  Trophy,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type MobileNavClientProps = {
  isLoggedIn: boolean;
  canReview?: boolean;
};

export function MobileNavClient({
  isLoggedIn,
  canReview = false
}: MobileNavClientProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => {
    menuRef.current?.removeAttribute("open");
  };
  const forumId = pathname.match(/^\/forum\/(\d+)(?:\/|$)/)?.[1];
  const composeHref = forumId ? `/compose?forum=${forumId}` : "/compose";
  const links = [
    { href: "/explore/active", label: "发现", icon: Compass },
    { href: "/forums", label: "版块", icon: Grid2X2 },
    { href: composeHref, label: "发布", icon: PenLine },
    {
      href: isLoggedIn ? "/me" : "/login?next=/me",
      label: "我的",
      icon: UserRound
    },
    { href: "/honors", label: "社区荣誉", icon: Trophy },
    ...(canReview
      ? [
          { href: "/reviews", label: "审核中心", icon: ShieldCheck },
          { href: "/cache", label: "缓存管理", icon: Database }
        ]
      : [])
  ];

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current?.open &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current?.open) {
        closeMenu();
        menuRef.current.querySelector<HTMLElement>("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <details className="mobile-menu" ref={menuRef}>
      <summary
        className="icon-button mobile-menu-button"
        aria-label="打开或关闭导航菜单"
      >
        <Menu className="mobile-menu-open-icon" size={20} />
        <X className="mobile-menu-close-icon" size={19} />
      </summary>
      <nav className="mobile-menu-popover" aria-label="移动端导航">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/explore/active"
              ? pathname.startsWith("/explore/")
              : href === "/forums"
                ? pathname === "/forums" || pathname.startsWith("/forum/")
                : href.startsWith("/compose")
                  ? pathname === "/compose"
                : href.startsWith("/login")
                  ? pathname === "/login"
                  : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={isActive ? "active" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={closeMenu}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
        {isLoggedIn ? (
          <form action="/api/logout" method="post">
            <button type="submit" onClick={closeMenu}>
              <LogOut size={18} />
              <span>退出登录</span>
            </button>
          </form>
        ) : (
          <div className="mobile-menu-auth">
            <Link
              href="/login"
              onClick={closeMenu}
            >
              <LogIn size={18} />
              <span>登录</span>
            </Link>
          </div>
        )}
      </nav>
    </details>
  );
}
