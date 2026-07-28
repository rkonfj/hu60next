import {
  Activity,
  ChevronRight,
  Clock3,
  History,
  Trophy
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { fullDate } from "@/lib/format";
import { getUserStatus } from "@/lib/hu60";
import { hasModeratorPermission } from "@/lib/moderator";
import type { HonorMember } from "@/lib/types";
import {
  getCurrentWeeklyMvpRanking,
  getWeeklyMvpRanking
} from "@/lib/weekly-report";

export const metadata: Metadata = {
  title: "MVP 排名",
  description: "查看虎绿林本周实时 MVP 排名与上周 MVP 名单。",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

function RankingBoard({
  title,
  description,
  members,
  current = false,
  icon: Icon
}: {
  title: string;
  description: string;
  members: HonorMember[];
  current?: boolean;
  icon: typeof Trophy;
}) {
  return (
    <section
      className={`mvp-ranking-board${current ? " is-current" : ""}`}
    >
      <header>
        <span className="mvp-ranking-board-icon" aria-hidden="true">
          <Icon size={19} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <strong>{members.length} 位</strong>
      </header>

      {members.length ? (
        <ol className="mvp-ranking-list">
          {members.map((member, index) => (
            <li key={member.uid}>
              <span
                className="mvp-ranking-position"
                aria-label={`第 ${index + 1} 位`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <Link
                href={current ? `/mvp/${member.uid}` : `/user/${member.uid}`}
                className="mvp-ranking-member"
              >
                <Avatar src={member.avatar} name={member.name} />
                <span className="mvp-ranking-member-copy">
                  <strong data-member-uid={member.uid}>{member.name}</strong>
                  {member.weeklySummary ? (
                    <small>{member.weeklySummary}</small>
                  ) : null}
                </span>
                <span className="mvp-ranking-score">
                  <strong>{member.weeklyScore ?? 0}</strong>
                  <small>分</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mvp-ranking-empty">当前还没有可展示的排名。</div>
      )}
    </section>
  );
}

export default async function MvpPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) redirect("/login?next=/mvp");

  const session = await getUserStatus(sid);
  if (
    session.isLogin !== true ||
    !hasModeratorPermission(session.permissions)
  ) {
    notFound();
  }

  const [current, previous] = await Promise.all([
    getCurrentWeeklyMvpRanking(),
    getWeeklyMvpRanking()
  ]);
  const updatedAt = Math.max(current.updatedAt, previous.updatedAt);

  return (
    <main className="page-shell content-page mvp-ranking-page">
      <header className="mvp-ranking-heading">
        <div>
          <span className="eyebrow">
            <Trophy size={14} />
            MOD 工具 · MVP 排名
          </span>
          <h1>本周实时排名</h1>
          <p>
            根据已有周统计缓存实时排序，同时保留上一自然周的最终名单。
          </p>
        </div>
        {updatedAt ? (
          <time dateTime={new Date(updatedAt * 1000).toISOString()}>
            <Clock3 size={13} />
            更新于 {fullDate(updatedAt)}
          </time>
        ) : null}
      </header>

      {current.__fallback || previous.__fallback ? (
        <div className="data-notice">
          部分 MVP 排名暂时不可用，请稍后刷新重试。
        </div>
      ) : null}

      <div className="mvp-ranking-grid">
        <RankingBoard
          title="本周实时排名"
          description="从现有缓存中的本周公开交流记录排序，最多展示 10 位"
          members={current.members}
          current
          icon={Activity}
        />
        <RankingBoard
          title="上周排名"
          description="上一自然周的最终 MVP 排名，保留前 5 位"
          members={previous.members}
          icon={History}
        />
      </div>

      {current.partial || previous.partial ? (
        <p className="mvp-ranking-partial">
          当前排名基于可读取的部分公开交流记录，实际分数可能更高。
        </p>
      ) : null}

      <footer className="mvp-ranking-footer">
        排名综合交流人数、破冰回复、讨论延续、收到交流和活跃天数计算。
      </footer>
    </main>
  );
}
