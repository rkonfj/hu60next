import {
  Activity,
  ArrowUpRight,
  Blocks,
  Bot,
  ChevronRight,
  Laptop,
  Megaphone,
  MonitorSmartphone,
  PanelsTopLeft,
  Smartphone,
  Trophy
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { getUserStatus } from "@/lib/hu60";
import type { Forum } from "@/lib/types";
import {
  getPersonalWeeklyReport,
  weeklyMvpScore
} from "@/lib/weekly-report";

const icons = [Laptop, PanelsTopLeft, Bot, Smartphone, Blocks, Megaphone];

async function HomeWeeklyReport() {
  const cookieStore = await cookies();
  const status = await getUserStatus(
    cookieStore.get("hulvlin_sid")?.value
  );

  if (!status.uid || !status.name) return null;

  const report = await getPersonalWeeklyReport(status.uid, status.name);

  return (
    <Link href="/me" className="home-weekly-report">
      <header>
        <span>
          <Activity size={15} />
          足迹
        </span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </header>

      {report.__fallback ? (
        <p>周报暂时不可用，点击进入“我的”页面稍后重试。</p>
      ) : (
        <>
          <div className="home-weekly-score">
            <span>
              <Trophy size={14} aria-hidden="true" />
              本周 MVP
            </span>
            <strong>
              {weeklyMvpScore(report.current)}
              <small>分</small>
            </strong>
          </div>
          <div className="home-weekly-metrics">
            <span>
              <strong>{report.current.discussionsJoined}</strong>
              场讨论
            </span>
            <span>
              <strong>{report.current.peopleInteracted}</strong>
              位会员
            </span>
            <span>
              <strong>{report.current.repliesReceived}</strong>
              条交流
            </span>
          </div>
        </>
      )}
    </Link>
  );
}

export function CommunityRail({
  forums,
  dailyTopicCounts
}: {
  forums: Forum[];
  dailyTopicCounts: Record<number, number>;
}) {
  return (
    <aside className="community-rail">
      <HomeWeeklyReport />
      <section className="forum-rail-panel">
        <div className="rail-title">
          <span>社区版块</span>
          <Link href="/forums">全部</Link>
        </div>
        <nav className="forum-nav" aria-label="社区版块">
          {forums.slice(0, 8).map((forum, index) => {
            const Icon = icons[index % icons.length];
            const dailyTopicCount = dailyTopicCounts[forum.id] ?? 0;
            return (
              <Link href={`/forum/${forum.id}`} key={forum.id}>
                <span className={`forum-icon forum-icon-${(index % 5) + 1}`}>
                  <Icon size={16} />
                </span>
                <strong>{forum.name}</strong>
                <span className="forum-nav-tail">
                  {dailyTopicCount > 0 ? (
                    <small title={`今日新增 ${dailyTopicCount} 条主题`}>
                      今日 {dailyTopicCount}
                    </small>
                  ) : null}
                  <ChevronRight size={14} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </nav>
      </section>
    </aside>
  );
}
