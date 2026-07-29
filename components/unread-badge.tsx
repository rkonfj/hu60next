"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const SESSION_UPDATE_EVENT = "hulvlin:session-update";

type SessionUpdate = {
  newMsg: number;
  newAtInfo: number;
};

export function MessageNotificationLink({
  initialNewMsg,
  initialNewAtInfo
}: {
  initialNewMsg: number;
  initialNewAtInfo: number;
}) {
  const [unread, setUnread] = useState({
    newMsg: Math.max(0, initialNewMsg),
    newAtInfo: Math.max(0, initialNewAtInfo)
  });

  useEffect(() => {
    function updateUnread(event: Event) {
      const detail = (event as CustomEvent<SessionUpdate>).detail;
      if (!detail) return;

      setUnread({
        newMsg: Math.max(0, Number(detail.newMsg) || 0),
        newAtInfo: Math.max(0, Number(detail.newAtInfo) || 0)
      });
    }

    window.addEventListener(SESSION_UPDATE_EVENT, updateUnread);
    return () => {
      window.removeEventListener(SESSION_UPDATE_EVENT, updateUnread);
    };
  }, []);

  const count = unread.newMsg + unread.newAtInfo;
  const href =
    unread.newMsg === 0 && unread.newAtInfo > 0
      ? "/messages/mentions"
      : "/messages/inbox";

  return (
    <Link href={href} className="icon-button" aria-label="消息">
      <Bell size={18} />
      {count > 0 ? <span className="notification-dot">{count}</span> : null}
    </Link>
  );
}
