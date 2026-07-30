"use client";

import { useTopicReplyComposer } from "@/components/topic-reply-composer-context";
import { formatAtTaMention } from "@/lib/topic-at";

type TopicAtTaLinkProps = {
  authorName: string;
  className?: string;
};

export function TopicAtTaLink({ authorName, className }: TopicAtTaLinkProps) {
  const { insertMention } = useTopicReplyComposer();

  return (
    <button
      type="button"
      className={["topic-at-ta-link", className].filter(Boolean).join(" ")}
      aria-label={`@${authorName}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add("is-used");
        insertMention(formatAtTaMention(authorName), true);
      }}
    >
      @Ta
    </button>
  );
}
