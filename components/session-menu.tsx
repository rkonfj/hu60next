"use client";

import { Bell, LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Session = {
  uid: number | null;
  name: string | null;
  isLogin: boolean | null;
  newMsg: number;
  newAtInfo: number;
};

export function SessionMenu() {
  const [session, setSession] = useState<Session | null>(null);
  const pathname = usePathname();

  const refreshSession = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/session", {
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin"
    })
      .then((response) => response.json())
      .then(setSession)
      .catch(() => setSession(null));
    return controller;
  }, []);

  useEffect(() => {
    const controller = refreshSession();
    const handleSessionChange = () => refreshSession();
    const handleFocus = () => refreshSession();

    window.addEventListener("hulvlin:session-changed", handleSessionChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      controller.abort();
      window.removeEventListener("hulvlin:session-changed", handleSessionChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [pathname, refreshSession]);

  if (!session?.uid) {
    return (
      <Link href="/login" className="header-login">
        <LogIn size={17} />
        <span>登录</span>
      </Link>
    );
  }

  const unread = Number(session.newMsg || 0) + Number(session.newAtInfo || 0);

  return (
    <div className="session-actions">
      <Link href="/messages" className="icon-button" aria-label="消息">
        <Bell size={18} />
        {unread > 0 && <span className="notification-dot">{unread}</span>}
      </Link>
      <span className="session-user">
        <UserRound size={17} />
        {session.name}
      </span>
      <form action="/api/logout" method="post">
        <button className="icon-button" type="submit" aria-label="退出登录">
          <LogOut size={17} />
        </button>
      </form>
    </div>
  );
}
