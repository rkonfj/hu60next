import {
  Award,
  ChevronRight,
  Sparkles,
  Trophy
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { fullDate } from "@/lib/format";
import { getHonorRoll } from "@/lib/hu60";
import type { HonorMember } from "@/lib/types";
import { getWeeklyMvpRanking } from "@/lib/weekly-report";

export const metadata: Metadata = {
  title: "社区荣誉",
  description: "记录近期持续为虎绿林带来讨论的社区成员。"
};

export const dynamic = "force-dynamic";

function HonorBoard({
  title,
  description,
  honorLabel,
  members,
  showMemberTitle = false,
  showWeeklyScore = false,
  featured = false,
  icon: Icon
}: {
  title: string;
  description: string;
  honorLabel?: string;
  members: HonorMember[];
  showMemberTitle?: boolean;
  showWeeklyScore?: boolean;
  featured?: boolean;
  icon: typeof Award;
}) {
  return (
    <section className={`honor-board${featured ? " featured" : ""}`}>
      <header className="honor-board-heading">
        <span className="honor-board-icon" aria-hidden="true">
          <Icon size={19} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      {members.length ? (
        <ol className="honor-list">
          {members.map((member, index) => (
            <li key={member.uid}>
              <span className="honor-position" aria-label={`第 ${index + 1} 位`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <Link href={`/user/${member.uid}`} className="honor-member">
                <Avatar src={member.avatar} name={member.name} />
                <span className="honor-member-copy">
                  <strong>{member.name}</strong>
                  {honorLabel ? (
                    <span className="honor-label">{honorLabel}</span>
                  ) : null}
                  {showWeeklyScore &&
                  typeof member.weeklyScore === "number" ? (
                    <span className="honor-score">
                      {member.weeklyScore} 分
                    </span>
                  ) : null}
                  {showMemberTitle && member.memberTitle ? (
                    <span className="member-badge honor-member-badge">
                      {member.memberTitle}
                    </span>
                  ) : null}
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="honor-empty">本期荣誉正在等待新的名字。</div>
      )}
    </section>
  );
}

export default async function HonorsPage() {
  const [honors, mvp] = await Promise.all([
    getHonorRoll(),
    getWeeklyMvpRanking()
  ]);
  const updatedAt = Math.max(honors.updatedAt, mvp.updatedAt);

  return (
    <main className="page-shell content-page honors-page">
      <header className="honors-heading">
        <div>
          <span className="eyebrow">
            <Trophy size={14} />
            社区荣誉
          </span>
          <h1>熟悉的名字，持续生长的讨论</h1>
          <p>记录近期为社区带来持续讨论的成员，荣誉名单动态更新。</p>
        </div>
        {updatedAt ? (
          <time dateTime={new Date(updatedAt * 1000).toISOString()}>
            更新于 {fullDate(updatedAt)}
          </time>
        ) : null}
      </header>

      {honors.__fallback || mvp.__fallback ? (
        <div className="data-notice">
          部分荣誉数据暂时不可用，请稍后刷新重试。
        </div>
      ) : null}

      <div className="honors-grid">
        <HonorBoard
          title="本周 MVP"
          description="按交流人数、破冰回复和带动讨论延续综合计算"
          members={mvp.members}
          showWeeklyScore
          featured
          icon={Trophy}
        />
        <HonorBoard
          title="活跃荣誉"
          description="感谢让讨论持续发生的熟悉身影"
          honorLabel="活跃荣誉"
          members={honors.active}
          icon={Sparkles}
        />
        <HonorBoard
          title="资历荣誉"
          description="致敬近期仍在社区留下作品的老朋友"
          members={honors.legacy}
          showMemberTitle
          icon={Award}
        />
      </div>
      {mvp.partial ? (
        <p className="honor-partial">
          本期 MVP 根据最近一部分公开交流记录计算。
        </p>
      ) : null}
    </main>
  );
}
