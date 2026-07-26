import { Bot, Clock3, History, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReviewLogEntry } from "@/lib/types";

function reviewActionName(stat: number) {
  switch (stat) {
    case 0:
      return "审核通过";
    case 1:
      return "设为待审核";
    case 2:
      return "站长屏蔽";
    case 3:
      return "审核不通过";
    case 4:
      return "需要人工复核";
    case 5:
      return "机审不通过";
    case 6:
      return "机审通过";
    default:
      return `未知状态 ${stat}`;
  }
}

function reviewTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  }).format(new Date(timestamp * 1000));
}

export function ReviewLogTimeline({
  logs,
  defaultOpen = false
}: {
  logs?: ReviewLogEntry[];
  defaultOpen?: boolean;
}) {
  const entries = Array.isArray(logs) ? logs : [];

  return (
    <details className="review-log-panel" open={defaultOpen}>
      <summary>
        <History size={14} />
        审核记录
        <span>{entries.length}</span>
      </summary>
      {entries.length ? (
        <ol className="review-log-timeline">
          {[...entries].reverse().map((entry, index) => {
            const isAutomatic = Number(entry.uid) === -100;
            return (
              <li key={`${entry.time}-${entry.uid}-${index}`}>
                <span className="review-log-marker" aria-hidden="true" />
                <div className="review-log-heading">
                  <strong>{reviewActionName(Number(entry.stat))}</strong>
                  <time dateTime={new Date(entry.time * 1000).toISOString()}>
                    <Clock3 size={12} />
                    {reviewTime(Number(entry.time))}
                  </time>
                </div>
                <div className="review-log-reviewer">
                  {isAutomatic ? (
                    <>
                      <Bot size={13} />
                      自动审核
                    </>
                  ) : (
                    <Link href={`/user/${entry.uid}`}>
                      <UserRound size={13} />
                      审核员 #{entry.uid}
                    </Link>
                  )}
                </div>
                <p>{entry.comment?.trim() || "未填写理由"}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="review-log-empty">暂无历史审核记录。</p>
      )}
    </details>
  );
}
