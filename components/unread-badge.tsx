"use client";

import { useEffect, useState } from "react";

export const SESSION_UPDATE_EVENT = "hulvlin:session-update";

type SessionUpdate = {
  newMsg: number;
  newAtInfo: number;
};

export function UnreadBadge({
  initialNewMsg,
  initialNewAtInfo
}: {
  initialNewMsg: number;
  initialNewAtInfo: number;
}) {
  const [unread, setUnread] = useState(
    Math.max(0, initialNewMsg) + Math.max(0, initialNewAtInfo)
  );

  useEffect(() => {
    function updateUnread(event: Event) {
      const detail = (event as CustomEvent<SessionUpdate>).detail;
      if (!detail) return;

      setUnread(
        Math.max(0, Number(detail.newMsg) || 0) +
          Math.max(0, Number(detail.newAtInfo) || 0)
      );
    }

    window.addEventListener(SESSION_UPDATE_EVENT, updateUnread);
    return () => {
      window.removeEventListener(SESSION_UPDATE_EVENT, updateUnread);
    };
  }, []);

  if (unread < 1) return null;

  return <span className="notification-dot">{unread}</span>;
}
