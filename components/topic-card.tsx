import {
  ArrowUpRight,
  Eye,
  Flame,
  LockKeyhole,
  MessageCircle
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { cleanSummary, compactNumber, relativeTime } from "@/lib/format";
import type { Topic } from "@/lib/types";

export function TopicCard({
  topic,
  now,
  compact = false,
  rank
}: {
  topic: Topic;
  now?: number;
  compact?: boolean;
  rank?: number;
}) {
  const author = topic._u_name || topic.uinfo?.name || `用户 ${topic.uid}`;

  if (compact) {
    return (
      <Link href={`/topic/${topic.topic_id || topic.id}`} className="compact-topic">
        {rank && <span className={`rank rank-${rank}`}>{rank}</span>}
        <span>
          <strong>{topic.title}</strong>
          <small>
            {topic.forum_name} · {topic.reply_count} 回复
          </small>
        </span>
        <ArrowUpRight size={15} />
      </Link>
    );
  }

  return (
    <article className="topic-card">
      <Link href={`/topic/${topic.topic_id || topic.id}`} className="topic-main">
        <h2>
          {topic.essence ? (
            <span className="topic-state essence">
              <Flame size={13} /> 精华
            </span>
          ) : null}
          {topic.locked ? (
            <span className="topic-state locked">
              <LockKeyhole size={13} /> 已锁
            </span>
          ) : null}
          {topic.title}
        </h2>
        <p>{cleanSummary(topic._topic_summary)}</p>
      </Link>
      <div className="topic-card-meta">
        <Avatar src={topic._u_avatar} name={author} size="sm" />
        <div className="topic-card-author-copy">
          <strong>{author}</strong>
          <span>{relativeTime(topic.mtime || topic.ctime, now)}</span>
        </div>
        <Link
          href={`/forum/${topic.forum_id}`}
          className="forum-pill"
          aria-label={`进入${topic.forum_name}版块`}
        >
          {topic.forum_name}
        </Link>
        <span className="topic-card-stat">
          <MessageCircle size={15} />
          {compactNumber(topic.reply_count)} 回复
        </span>
        <span className="topic-card-stat">
          <Eye size={15} />
          {compactNumber(topic.read_count)} 阅读
        </span>
        <Link
          href={`/topic/${topic.topic_id || topic.id}`}
          className="topic-card-open"
          aria-label="进入讨论"
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
