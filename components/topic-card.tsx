import {
  ArrowUpRight,
  Eye,
  LockKeyhole,
  MessageCircle,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { cleanSummary, compactNumber, relativeTime } from "@/lib/format";
import { topicFloorHref } from "@/lib/topic-navigation";
import type { Topic } from "@/lib/types";

export function TopicCard({
  topic,
  now,
  compact = false,
  rank,
  pageFirst = false,
  pageLast = false
}: {
  topic: Topic;
  now?: number;
  compact?: boolean;
  rank?: number;
  pageFirst?: boolean;
  pageLast?: boolean;
}) {
  const author = topic._u_name || topic.uinfo?.name || `用户 ${topic.uid}`;
  const topicId = topic.topic_id || topic.id;
  const lastReplyHref = topicFloorHref(topicId, topic.reply_count);

  if (compact) {
    return (
      <Link href={`/topic/${topicId}`} className="compact-topic">
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
      {pageFirst ? (
        <span
          className="pagination-scroll-target"
          id="first-topic"
          aria-hidden="true"
        />
      ) : null}
      {pageLast ? (
        <span
          className="pagination-scroll-target"
          id="last-topic"
          aria-hidden="true"
        />
      ) : null}
      <div className="topic-main">
        <h2>
          <Link href={`/topic/${topicId}`}>
            {topic.essence ? (
              <span
                className="topic-state essence"
                aria-label="精华"
                title="精华"
              >
                <Sparkles size={15} aria-hidden="true" />
              </span>
            ) : null}
            {topic.locked ? (
              <span className="topic-state locked">
                <LockKeyhole size={13} /> 已锁
              </span>
            ) : null}
            {topic.title}
          </Link>
          <Link
            href={`/forum/${topic.forum_id}`}
            className="forum-pill topic-title-forum"
            aria-label={`进入${topic.forum_name}版块`}
          >
            {topic.forum_name}
          </Link>
        </h2>
        <Link href={`/topic/${topicId}`}>
          <p>{cleanSummary(topic._topic_summary)}</p>
        </Link>
      </div>
      <div className="topic-card-meta">
        <Link href={`/user/${topic.uid}`} className="topic-card-author-link">
          <Avatar src={topic._u_avatar} name={author} size="sm" />
          <div className="topic-card-author-copy">
            <strong data-member-uid={topic.uid}>{author}</strong>
            <span>{relativeTime(topic.mtime || topic.ctime, now)}</span>
          </div>
        </Link>
        <Link
          href={`/topic/${topicId}#quick-reply`}
          className="topic-card-stat"
          aria-label={`前往回复框，共 ${topic.reply_count} 条回复`}
        >
          <MessageCircle size={15} />
          {compactNumber(topic.reply_count)}
          <span className="topic-card-stat-label">回复</span>
        </Link>
        <span className="topic-card-stat">
          <Eye size={15} />
          {compactNumber(topic.read_count)}
          <span className="topic-card-stat-label">阅读</span>
        </span>
        <Link
          href={lastReplyHref}
          className="topic-card-open"
          aria-label={
            topic.reply_count > 0 ? "查看最后一条回复" : "进入讨论"
          }
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
