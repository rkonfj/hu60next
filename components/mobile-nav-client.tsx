"use client";

import {
  Compass,
  Grid2X2,
  LogIn,
  LogOut,
  Menu,
  PenLine,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

type MobileNavClientProps = {
  isLoggedIn: boolean;
};

export function MobileNavClient({ isLoggedIn }: MobileNavClientProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const links = [
    { href: "/explore/active", label: "发现", icon: Compass },
    { href: "/forums", label: "版块", icon: Grid2X2 },
    { href: "/compose", label: "发布", icon: PenLine },
    {
      href: isLoggedIn ? "/me" : "/login?next=/me",
      label: "我的",
      icon: UserRound
    }
  ];

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
                : href.startsWith("/login")
                  ? pathname === "/login"
                  : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={isActive ? "active" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={() => menuRef.current?.removeAttribute("open")}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
        {isLoggedIn ? (
          <form action="/api/logout" method="post">
            <button type="submit">
              <LogOut size={18} />
              <span>退出登录</span>
            </button>
          </form>
        ) : (
          <div className="mobile-menu-auth">
            <Link
              href="/login"
              onClick={() => menuRef.current?.removeAttribute("open")}
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
