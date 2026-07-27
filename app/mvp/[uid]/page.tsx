import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CircleDot,
  MessageCircle,
  ShieldCheck,
  Trophy,
  Users
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { fullDate } from "@/lib/format";
import { getUserProfile, getUserStatus } from "@/lib/hu60";
import { hasModeratorPermission } from "@/lib/moderator";
import {
  getPersonalWeeklyReport,
  weeklyMvpBreakdown,
  weeklyMvpScore
} from "@/lib/weekly-report";

type MvpAnalysisPageProps = {
  params: Promise<{ uid: string }>;
};

export const metadata: Metadata = {
  title: "MVP 分数分析",
  robots: { index: false, follow: false }
};

function periodDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai"
  }).format(new Date(timestamp * 1000));
}

export default async function MvpAnalysisPage({
  params
}: MvpAnalysisPageProps) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid) || uid <= 0) notFound();

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) redirect(`/login?next=/mvp/${uid}`);

  const session = await getUserStatus(sid);
  if (
    session.isLogin !== true ||
    !hasModeratorPermission(session.permissions)
  ) {
    notFound();
  }

  const profile = await getUserProfile(uid);
  if (profile.__fallback) {
    return (
      <main className="page-shell narrow-page content-page mvp-analysis-page">
        <div className="data-notice">
          暂时无法读取该用户资料，请稍后刷新重试。
        </div>
      </main>
    );
  }

  const name = profile.name || profile._u_name || `用户 ${uid}`;
  const report = await getPersonalWeeklyReport(uid, name);
  if (report.__fallback) {
    return (
      <main className="page-shell narrow-page content-page mvp-analysis-page">
        <div className="data-notice">
          暂时无法生成该用户的本周 MVP 分析，请稍后刷新重试。
        </div>
      </main>
    );
  }

  const breakdown = weeklyMvpBreakdown(report.current);
  const totalScore = weeklyMvpScore(report.current);
  const previousScore = weeklyMvpScore(report.previous);
  const scoreChange = totalScore - previousScore;
  const maxPoints = Math.max(1, ...breakdown.map((item) => item.points));

  return (
    <main className="page-shell narrow-page content-page mvp-analysis-page">
      <header className="mvp-analysis-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={14} />
            MOD 工具
          </span>
          <h1>本周 MVP 分数分析</h1>
          <p>查看用户本周交流得分的组成与计算依据。</p>
        </div>
        <Link href={`/user/${uid}`} className="mvp-analysis-back">
          <ArrowLeft size={15} />
          用户主页
        </Link>
      </header>

      <section className="mvp-analysis-summary">
        <div className="mvp-analysis-user">
          <Avatar src={profile._u_avatar} name={name} size="xl" />
          <div>
            <span>UID {uid}</span>
            <div>
              <h2 data-member-uid={uid}>{name}</h2>
            </div>
            <p>
              <CalendarDays size={14} />
              {periodDate(report.periodStart)}—{periodDate(report.periodEnd)}
            </p>
          </div>
        </div>
        <div className="mvp-analysis-total">
          <span>
            <Trophy size={16} />
            本周得分
          </span>
          <strong>{totalScore}</strong>
          <small>分</small>
          <p className={scoreChange < 0 ? "is-down" : undefined}>
            较上周同期
            {scoreChange === 0
              ? "持平"
              : `${scoreChange > 0 ? "+" : "−"}${Math.abs(scoreChange)} 分`}
          </p>
        </div>
      </section>

      {report.partial ? (
        <div className="data-notice">
          本次分析基于当前可读取的部分公开交流记录，实际分数可能更高。
        </div>
      ) : null}

      <section className="mvp-breakdown-panel">
        <header>
          <div>
            <span className="eyebrow">
              <Activity size={14} />
              得分构成
            </span>
            <h2>共 {breakdown.length} 项计分指标</h2>
          </div>
          <strong>{totalScore} 分</strong>
        </header>
        <ol className="mvp-breakdown-list">
          {breakdown.map((item) => (
            <li key={item.key}>
              <div className="mvp-breakdown-copy">
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    {item.value} × {item.weight}
                    {"cap" in item ? `（最多 ${item.cap} 分）` : ""}
                  </span>
                </div>
                <p>{item.description}</p>
                <span className="mvp-breakdown-track" aria-hidden="true">
                  <i
                    style={{
                      width: `${Math.max(
                        item.points > 0 ? 5 : 0,
                        (item.points / maxPoints) * 100
                      )}%`
                    }}
                  />
                </span>
              </div>
              <strong className="mvp-breakdown-points">
                {item.points}
                <small>分</small>
              </strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="mvp-reference-panel">
        <header>
          <span className="eyebrow">
            <CircleDot size={14} />
            参考数据
          </span>
          <h2>不直接计分的本周指标</h2>
        </header>
        <div>
          <span>
            <MessageCircle size={17} />
            <strong>{report.current.repliesMade}</strong>
            发表回复
          </span>
          <span>
            <Users size={17} />
            <strong>{report.current.forumsVisited}</strong>
            活跃版块
          </span>
          <span>
            <Activity size={17} />
            <strong>{report.highlights.length}</strong>
            重点讨论
          </span>
        </div>
      </section>

      {report.highlights.length ? (
        <section className="mvp-highlight-panel">
          <header>
            <h2>本周重点讨论</h2>
            <span>按参与人数与交流量排序</span>
          </header>
          <div>
            {report.highlights.map((highlight) => (
              <Link
                href={`/topic/${highlight.topicId}`}
                key={highlight.topicId}
                prefetch={false}
              >
                <strong>{highlight.title}</strong>
                <span>
                  {highlight.participants} 位会员 · {highlight.activityCount} 次交流
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mvp-analysis-footer">
        数据更新于 {fullDate(report.updatedAt)}，结果使用服务器内存缓存。
      </footer>
    </main>
  );
}
