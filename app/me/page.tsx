import {
  Activity,
  Bell,
  Bookmark,
  CalendarDays,
  LogOut,
  MessageCircle,
  MessageSquareText,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserStatus } from "@/lib/hu60";
import { relativeTime } from "@/lib/format";
import {
  getPersonalWeeklyReport,
  weeklyMvpScore
} from "@/lib/weekly-report";

export const metadata: Metadata = { title: "我的" };

function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai"
  }).format(new Date(timestamp * 1000));
}

function changeLabel(current: number, previous: number) {
  const difference = current - previous;
  if (difference === 0) return "与上周同期持平";
  return `比上周同期 ${difference > 0 ? "+" : "−"}${Math.abs(difference)}`;
}

export default async function MePage() {
  const cookieStore = await cookies();
  const status = await getUserStatus(
    cookieStore.get("hulvlin_sid")?.value
  );

  if (!status.uid && status.isLogin !== true) {
    redirect("/login?next=/me");
  }

  const report =
    status.uid && status.name
      ? await getPersonalWeeklyReport(status.uid, status.name)
      : null;
  const currentMvpScore =
    report && !report.__fallback
      ? weeklyMvpScore(report.current)
      : null;
  const unread = Number(status.newMsg || 0) + Number(status.newAtInfo || 0);
  const metrics = report
    ? [
        {
          label: "参与讨论",
          value: report.current.discussionsJoined,
          previous: report.previous.discussionsJoined,
          icon: MessageSquareText
        },
        {
          label: "发表回复",
          value: report.current.repliesMade,
          previous: report.previous.repliesMade,
          icon: MessageCircle
        },
        {
          label: "收到交流",
          value: report.current.repliesReceived,
          previous: report.previous.repliesReceived,
          icon: Bell
        },
        {
          label: "交流会员",
          value: report.current.peopleInteracted,
          previous: report.previous.peopleInteracted,
          icon: Users
        },
        {
          label: "带动延续",
          value: report.current.continuedDiscussions,
          previous: report.previous.continuedDiscussions,
          icon: Sparkles
        },
        {
          label: "活跃天数",
          value: report.current.activeDays,
          previous: report.previous.activeDays,
          icon: CalendarDays
        }
      ]
    : [];

  return (
    <main className="page-shell narrow-page content-page account-page">
      <section className="account-summary">
        <span className="account-avatar" aria-hidden="true">
          <UserRound size={30} />
        </span>
        <div>
          <span className="eyebrow">我的账号</span>
          <h1 data-member-uid={status.uid}>
            {status.name || "hu60 用户"}
          </h1>
          <p>UID {status.uid ?? "—"}</p>
        </div>
        <form action="/api/logout" method="post">
          <button type="submit">
            <LogOut size={16} /> 退出登录
          </button>
        </form>
      </section>

      <section className="weekly-report-panel">
        <header className="weekly-report-heading">
          <div>
            <span className="eyebrow">
              <Activity size={14} />
              足迹
            </span>
            <h2>本周，你与社区的连接</h2>
            {report ? (
              <p>
                {shortDate(report.periodStart)}—{shortDate(report.periodEnd)}
              </p>
            ) : null}
          </div>
          {report && !report.__fallback && currentMvpScore !== null ? (
            <div className="weekly-report-heading-meta">
              <time
                dateTime={new Date(report.updatedAt * 1000).toISOString()}
              >
                {relativeTime(report.updatedAt)}
              </time>
              <span
                className="weekly-report-mvp-score"
                aria-label={`本周 MVP 分数 ${currentMvpScore} 分`}
              >
                <Trophy size={14} aria-hidden="true" />
                <span>本周 MVP</span>
                <strong>{currentMvpScore}</strong>
                <small>分</small>
              </span>
            </div>
          ) : null}
        </header>

        {!report || report.__fallback ? (
          <div className="data-notice">
            暂时无法生成交流周报，请稍后刷新重试。
          </div>
        ) : (
          <>
            <p className="weekly-report-summary">
              {report.current.discussionsJoined ||
              report.current.repliesReceived ? (
                <>
                  你参与了{" "}
                  <strong>{report.current.discussionsJoined}</strong>{" "}
                  场讨论，与{" "}
                  <strong>{report.current.peopleInteracted}</strong>{" "}
                  位会员产生交流
                  {report.current.continuedDiscussions
                    ? `，并让 ${report.current.continuedDiscussions} 场讨论继续展开。`
                    : "。"}
                </>
              ) : (
                "本周还没有公开交流记录。去看看正在发生的讨论，也许一句回复就是一段新交流的开始。"
              )}
            </p>

            <div className="weekly-report-metrics">
              {metrics.map(
                ({ label, value, previous, icon: Icon }) => (
                  <article key={label}>
                    <span className="weekly-metric-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{value}</strong>
                      <span>{label}</span>
                      <small
                        className={
                          value > previous
                            ? "positive"
                            : value < previous
                              ? "negative"
                              : undefined
                        }
                      >
                        {changeLabel(value, previous)}
                      </small>
                    </div>
                  </article>
                )
              )}
            </div>

            {report.highlights.length ? (
              <div className="weekly-report-highlights">
                <h3>本周值得记住的讨论</h3>
                <div>
                  {report.highlights.map((item) => (
                    <Link href={`/topic/${item.topicId}`} key={item.topicId}>
                      <span>{item.title}</span>
                      <small>
                        {item.participants} 位会员参与 ·{" "}
                        {item.activityCount} 条近期回复
                      </small>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {report.partial ? (
              <p className="weekly-report-partial">
                活动量较大，本期周报仅根据最近一部分公开记录生成。
              </p>
            ) : null}
          </>
        )}
      </section>

      <div className="account-links">
        {status.permissions?.includes("PERMISSION_REVIEW_POST") ? (
          <Link href="/reviews">
            <ShieldCheck size={20} />
            <span>
              <strong>审核中心</strong>
              <small>审核帖子、回复并查看完整记录</small>
            </span>
          </Link>
        ) : null}
        <Link href="/messages">
          <Bell size={20} />
          <span>
            <strong>消息中心</strong>
            <small>{unread ? `${unread} 条未读消息` : "暂无未读消息"}</small>
          </span>
        </Link>
        <Link href="/compose">
          <PenLine size={20} />
          <span>
            <strong>发布内容</strong>
            <small>发起一条新的技术讨论</small>
          </span>
        </Link>
        <Link href={`/user/${status.uid}`}>
          <MessageSquareText size={20} />
          <span>
            <strong>我的主页</strong>
            <small>查看我的资料和发布内容</small>
          </span>
        </Link>
        <Link href="/honors">
          <Trophy size={20} />
          <span>
            <strong>社区荣誉</strong>
            <small>看看本期被社区记住的名字</small>
          </span>
        </Link>
        <Link href="/favorites">
          <Bookmark size={20} />
          <span>
            <strong>我的收藏</strong>
            <small>查看收藏的主题</small>
          </span>
        </Link>
        <Link href="/relationships/follow">
          <Users size={20} />
          <span>
            <strong>关注与屏蔽</strong>
            <small>查看关注和屏蔽关系</small>
          </span>
        </Link>
        <Link href="/settings">
          <Settings size={20} />
          <span>
            <strong>账号设置</strong>
            <small>修改头像、资料和密码</small>
          </span>
        </Link>
      </div>
    </main>
  );
}
