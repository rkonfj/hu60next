"use client";

import {
  Bell,
  Compass,
  Grid2X2,
  Menu,
  PenLine,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MobileNavClientProps = {
  isLoggedIn: boolean;
};

export function MobileNavClient({ isLoggedIn }: MobileNavClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const links = [
    { href: "/explore/latest", label: "发现", icon: Compass },
    { href: "/forums", label: "版块", icon: Grid2X2 },
    { href: "/compose", label: "发布", icon: PenLine },
    { href: "/messages", label: "消息", icon: Bell },
    {
      href: isLoggedIn ? "/me" : "/login?next=/me",
      label: "我的",
      icon: UserRound
    }
  ];

  useEffect(() => {
    if (!isOpen) return;

    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="mobile-menu" ref={menuRef}>
      <button
        className="icon-button mobile-menu-button"
        type="button"
        aria-label={isOpen ? "关闭导航菜单" : "打开导航菜单"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={19} /> : <Menu size={20} />}
      </button>
      {isOpen ? (
        <nav
          id="mobile-navigation"
          className="mobile-menu-popover"
          aria-label="移动端导航"
        >
          {links.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/explore/latest"
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
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
