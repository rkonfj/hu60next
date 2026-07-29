"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopicCard } from "@/components/topic-card";
import { SESSION_UPDATE_EVENT } from "@/components/unread-badge";
import type { HomeResponse, Topic } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;
const MAX_RETRY_INTERVAL_MS = 60_000;
const HIGHLIGHT_DURATION_MS = 8_000;

type Highlight = {
  expiresAt: number;
  label: string;
};

function topicId(topic: Topic) {
  return topic.topic_id || topic.id;
}

function topicSnapshot(topics: Topic[]) {
  return new Map(topics.map((topic) => [topicId(topic), topic]));
}

function updateLabel(previous: Topic | undefined, current: Topic) {
  if (!previous) return "新帖子";

  const replyDelta =
    Number(current.reply_count || 0) - Number(previous.reply_count || 0);
  if (replyDelta > 0) return `新增 ${replyDelta} 条回复`;

  if (
    current.locked !== previous.locked ||
    current.review !== previous.review
  ) {
    return "状态已更新";
  }

  if (
    current.title !== previous.title ||
    current._topic_summary !== previous._topic_summary ||
    current.mtime !== previous.mtime
  ) {
    return "内容有更新";
  }

  if (current.read_count !== previous.read_count) {
    return "热度有更新";
  }

  return null;
}

export function ActiveTopicFeed({
  initialTopics,
  initialNow,
  page
}: {
  initialTopics: Topic[];
  initialNow?: number;
  page: number;
}) {
  const [topics, setTopics] = useState(initialTopics);
  const [now, setNow] = useState(initialNow);
  const [highlights, setHighlights] = useState<Map<number, Highlight>>(
    new Map()
  );
  const previousTopics = useRef(topicSnapshot(initialTopics));

  const applyFeed = useCallback((feed: HomeResponse) => {
    const nextTopics = Array.isArray(feed.newTopicList)
      ? feed.newTopicList
      : [];
    const previous = previousTopics.current;
    const changed = new Map<number, Highlight>();
    const expiresAt = Date.now() + HIGHLIGHT_DURATION_MS;

    for (const topic of nextTopics) {
      const id = topicId(topic);
      const label = updateLabel(previous.get(id), topic);
      if (label) changed.set(id, { expiresAt, label });
    }

    previousTopics.current = topicSnapshot(nextTopics);
    setTopics(nextTopics);
    setNow(feed._time || Math.floor(Date.now() / 1000));
    setHighlights((current) => {
      const next = new Map(
        Array.from(current).filter(([, highlight]) => {
          return highlight.expiresAt > Date.now();
        })
      );
      changed.forEach((highlight, id) => next.set(id, highlight));
      return next;
    });

    if (feed._myself) {
      window.dispatchEvent(
        new CustomEvent(SESSION_UPDATE_EVENT, {
          detail: {
            newMsg: Number(feed._myself.newMsg || 0),
            newAtInfo: Number(feed._myself.newAtInfo || 0)
          }
        })
      );
    }
  }, []);

  useEffect(() => {
    if (page !== 1) return;

    let controller: AbortController | null = null;
    let failures = 0;
    let inFlight = false;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule(delay: number) {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(poll, delay);
    }

    async function poll() {
      if (stopped || inFlight) return;
      if (document.hidden || !navigator.onLine) {
        schedule(POLL_INTERVAL_MS);
        return;
      }

      inFlight = true;
      controller = new AbortController();

      try {
        const response = await fetch("/api/explore/active?page=1", {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const feed = (await response.json()) as HomeResponse;
        if (feed.__fallback || !Array.isArray(feed.newTopicList)) {
          throw new Error("活跃帖子暂时不可用");
        }

        applyFeed(feed);
        failures = 0;
        schedule(POLL_INTERVAL_MS);
      } catch (error) {
        if (controller.signal.aborted || stopped) return;
        failures += 1;
        schedule(
          Math.min(
            MAX_RETRY_INTERVAL_MS,
            POLL_INTERVAL_MS * 2 ** failures
          )
        );
      } finally {
        inFlight = false;
      }
    }

    function refreshWhenActive() {
      if (document.hidden || !navigator.onLine || inFlight) return;
      clearTimeout(timer);
      void poll();
    }

    function handleVisibilityChange() {
      if (!document.hidden) refreshWhenActive();
    }

    schedule(POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshWhenActive);
    window.addEventListener("online", refreshWhenActive);

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener("focus", refreshWhenActive);
      window.removeEventListener("online", refreshWhenActive);
    };
  }, [applyFeed, page]);

  useEffect(() => {
    if (!highlights.size) return;

    const nextExpiry = Math.min(
      ...Array.from(highlights.values(), ({ expiresAt }) => expiresAt)
    );
    const timer = setTimeout(() => {
      const currentTime = Date.now();
      setHighlights(
        (current) =>
          new Map(
            Array.from(current).filter(([, highlight]) => {
              return highlight.expiresAt > currentTime;
            })
          )
      );
    }, Math.max(0, nextExpiry - Date.now()) + 50);

    return () => clearTimeout(timer);
  }, [highlights]);

  return (
    <div className="topic-list">
      {topics.map((topic, index) => (
        <TopicCard
          key={topicId(topic)}
          topic={topic}
          now={now}
          pageFirst={index === 0}
          pageLast={index === topics.length - 1}
          updateLabel={highlights.get(topicId(topic))?.label}
        />
      ))}
    </div>
  );
}
