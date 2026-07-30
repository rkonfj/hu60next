"use client";

import {
  ChevronDown,
  Puzzle,
  ShieldCheck,
  Trophy,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ReviewNotificationBadge } from "@/components/unread-badge";

type DesktopUserMenuProps = {
  userId: number | string;
  userName: string;
  canReview?: boolean;
};

export function DesktopUserMenu({
  userId,
  userName,
  canReview = false
}: DesktopUserMenuProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    menuRef.current?.removeAttribute("open");
  };

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
    <details className="desktop-user-menu" ref={menuRef}>
      <summary className="session-user">
        <UserRound size={17} />
        <span data-member-uid={userId}>{userName}</span>
        <ChevronDown size={13} />
      </summary>
      {canReview ? <ReviewNotificationBadge floating /> : null}
      <nav className="desktop-user-popover" aria-label="用户菜单">
        <Link
          href={`/user/${userId}`}
          prefetch={false}
          onClick={closeMenu}
        >
          <UserRound size={16} />
          我的主页
        </Link>
        <Link href="/honors" onClick={closeMenu}>
          <Trophy size={16} />
          社区荣誉
        </Link>
        <Link href="/settings/webplugs" onClick={closeMenu}>
          <Puzzle size={16} />
          网页插件
        </Link>
        {canReview ? (
          <>
            <Link href="/reviews" onClick={closeMenu}>
              <ShieldCheck size={16} />
              审核中心
              <ReviewNotificationBadge />
            </Link>
          </>
        ) : null}
      </nav>
    </details>
  );
}
