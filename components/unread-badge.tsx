"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const SESSION_UPDATE_EVENT = "hulvlin:session-update";

export type SessionUpdate = {
  newMsg: number;
  newAtInfo: number;
  countReview: number;
  chatCountReview: number;
};

let latestReviewCount = 0;

function reviewCount(update: SessionUpdate) {
  return (
    Math.max(0, Number(update.countReview) || 0) +
    Math.max(0, Number(update.chatCountReview) || 0)
  );
}

export function publishSessionUpdate(update: SessionUpdate) {
  latestReviewCount = reviewCount(update);
  window.dispatchEvent(
    new CustomEvent(SESSION_UPDATE_EVENT, { detail: update })
  );
}

export function SessionUpdatePublisher({
  update
}: {
  update: SessionUpdate;
}) {
  useEffect(() => {
    publishSessionUpdate(update);
  }, [
    update.chatCountReview,
    update.countReview,
    update.newAtInfo,
    update.newMsg
  ]);

  return null;
}

export function ReviewNotificationBadge({
  floating = false
}: {
  floating?: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(latestReviewCount);

    function updateReviewCount(event: Event) {
      const detail = (event as CustomEvent<SessionUpdate>).detail;
      if (!detail) return;

      latestReviewCount = reviewCount(detail);
      setCount(latestReviewCount);
    }

    window.addEventListener(SESSION_UPDATE_EVENT, updateReviewCount);
    return () => {
      window.removeEventListener(SESSION_UPDATE_EVENT, updateReviewCount);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      className={`review-notification-badge${floating ? " floating" : ""}`}
      aria-label={`${count} 项待审核`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

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
