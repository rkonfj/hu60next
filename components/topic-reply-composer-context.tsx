"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode
} from "react";
import { formatAtTaMention, resolveAtTaAuthor } from "@/lib/topic-at";
import { formatReplyQuote } from "@/lib/topic-reply-quote";

type InsertFn = (text: string, scrollToEditor?: boolean) => void;

type TopicReplyComposerContextValue = {
  insertMention: InsertFn;
  registerComposer: (insert: InsertFn) => () => void;
};

type TopicReplyComposerProviderProps = {
  children: ReactNode;
  topicId: number;
  currentPage: number;
  floorUbbById?: Record<number, string>;
};

const TopicReplyComposerContext =
  createContext<TopicReplyComposerContextValue | null>(null);

async function loadFloorUbb(
  topicId: number,
  contentId: number,
  currentPage: number
) {
  const params = new URLSearchParams({
    contentId: String(contentId),
    page: String(currentPage)
  });
  const response = await fetch(
    `/api/topics/${topicId}/floor-ubb?${params.toString()}`
  );
  const result = (await response.json()) as {
    success?: boolean;
    content?: string;
  };

  if (!response.ok || !result.success || typeof result.content !== "string") {
    return "";
  }

  return result.content;
}

export function TopicReplyComposerProvider({
  children,
  topicId,
  currentPage,
  floorUbbById = {}
}: TopicReplyComposerProviderProps) {
  const insertRef = useRef<InsertFn | null>(null);
  const pendingRef = useRef<Array<{ text: string; scroll: boolean }>>([]);
  const floorUbbRef = useRef(floorUbbById);
  const topicRef = useRef({ topicId, currentPage });

  floorUbbRef.current = floorUbbById;
  topicRef.current = { topicId, currentPage };

  const flushPending = useCallback(() => {
    const insert = insertRef.current;
    if (!insert) return;

    const queue = pendingRef.current.splice(0);
    for (const item of queue) {
      insert(item.text, item.scroll);
    }
  }, []);

  const insertMention = useCallback((text: string, scrollToEditor = true) => {
    const insert = insertRef.current;
    if (insert) {
      insert(text, scrollToEditor);
      return;
    }

    pendingRef.current.push({ text, scroll: scrollToEditor });
  }, []);

  const registerComposer = useCallback(
    (insert: InsertFn) => {
      insertRef.current = insert;
      flushPending();
      return () => {
        if (insertRef.current === insert) {
          insertRef.current = null;
        }
      };
    },
    [flushPending]
  );

  useEffect(() => {
    async function handleContentAtClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const replyTrigger = event.target.closest<HTMLElement>(
        "[data-reply-author]"
      );
      if (replyTrigger) {
        const author = replyTrigger.dataset.replyAuthor?.trim();
        const floor = Number(replyTrigger.dataset.replyFloor);
        const contentId = Number(replyTrigger.dataset.replyContentId);
        if (!author) return;

        event.preventDefault();

        const { topicId: activeTopicId, currentPage: page } = topicRef.current;
        let quotedContent =
          Number.isInteger(contentId) && contentId > 0
            ? floorUbbRef.current[contentId]
            : "";

        if (!quotedContent && Number.isInteger(contentId) && contentId > 0) {
          quotedContent = await loadFloorUbb(activeTopicId, contentId, page);
        }

        insertMention(
          formatReplyQuote(
            author,
            Number.isInteger(floor) && floor >= 0 ? floor : 0,
            quotedContent
          ),
          true
        );
        return;
      }

      const atTrigger = event.target.closest<HTMLElement>("a.userat");
      if (!atTrigger) return;

      const author = resolveAtTaAuthor(atTrigger);
      if (!author) return;

      event.preventDefault();
      atTrigger.classList.add("is-used");
      insertMention(formatAtTaMention(author), true);
    }

    document.addEventListener("click", handleContentAtClick);
    return () => document.removeEventListener("click", handleContentAtClick);
  }, [insertMention]);

  return (
    <TopicReplyComposerContext.Provider
      value={{ insertMention, registerComposer }}
    >
      {children}
    </TopicReplyComposerContext.Provider>
  );
}

export function useTopicReplyComposer() {
  const value = useContext(TopicReplyComposerContext);
  if (!value) {
    throw new Error(
      "useTopicReplyComposer must be used within TopicReplyComposerProvider"
    );
  }
  return value;
}
