import { CalendarDays, MessageSquareText, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import { UserRelationshipActions } from "@/components/user-relationship-actions";
import { fullDate } from "@/lib/format";
import { getUserProfile, getUserStatus, getUserTopics } from "@/lib/hu60";

type UserPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

function getMemberTitle(regtime?: number) {
  if (!regtime) return "创世会员";

  const registrationYear = new Date(regtime * 1000).getUTCFullYear();
  if (registrationYear <= 2014) return "传奇会员";
  if (registrationYear < 2018) return "骨灰会员";
  return "会员";
}

export async function generateMetadata({
  params
}: UserPageProps): Promise<Metadata> {
  const { id } = await params;
  const uid = Number(id);

  if (!Number.isInteger(uid) || uid <= 0) {
    return { title: "用户主页" };
  }

  const profile = await getUserProfile(uid);
  return {
    title: profile.name || `用户 ${uid}`,
    description: profile.signature || `虎绿林用户 ${uid} 的个人主页`
  };
}

export default async function UserPage({
  params,
  searchParams
}: UserPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const uid = Number(id);

  if (!Number.isInteger(uid) || uid <= 0) {
    notFound();
  }

  const page = Math.max(1, Number(query.page) || 1);
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const [profile, status] = await Promise.all([
    getUserProfile(uid),
    getUserStatus(sid)
  ]);
  const displayName = profile.name || profile._u_name || `用户 ${uid}`;
  const topics = await getUserTopics(displayName, page);
  const signature =
    profile.signature || profile._u_signature || "这位用户还没有留下个人签名。";
  const memberTitle = profile.__fallback
    ? null
    : getMemberTitle(profile.regtime);

  return (
    <main className="page-shell content-page user-page">
      {(profile.__fallback || topics.__fallback) && (
        <div className="data-notice">
          部分用户资料暂时无法读取，当前内容可能不完整。
        </div>
      )}

      <section className="user-profile-card">
        <Avatar
          src={profile._u_avatar}
          name={displayName}
          size="xl"
        />
        <div className="user-profile-copy">
          <span className="eyebrow">
            <UserRound size={14} />
            用户主页
          </span>
          <div className="user-profile-title">
            <h1>{displayName}</h1>
            {memberTitle ? <span>{memberTitle}</span> : null}
          </div>
          <p>{signature}</p>
          {profile.contact ? (
            <p className="user-profile-contact">{profile.contact}</p>
          ) : null}
          <UserRelationshipActions
            uid={uid}
            isLoggedIn={status.isLogin === true}
            isSelf={status.uid === uid}
            initialFollow={profile.isFollow === true}
            initialBlock={profile.isBlock === true}
          />
        </div>
        <div className="user-profile-stats">
          <span>
            <strong>{topics.topicCount}</strong>
            主题
          </span>
          <span>
            <strong>{uid}</strong>
            UID
          </span>
          {profile.regtime ? (
            <span
              className="user-registration"
              title={fullDate(profile.regtime)}
            >
              <CalendarDays size={14} />
              注册于 {fullDate(profile.regtime)}
            </span>
          ) : null}
        </div>
      </section>

      <section className="user-topic-section">
        <header className="user-topic-heading">
          <div>
            <span className="eyebrow">
              <MessageSquareText size={14} />
              发布记录
            </span>
            <h2>发布的主题</h2>
          </div>
          <span>第 {topics.currPage} 页</span>
        </header>

        <div className="topic-list">
          {topics.topicList.map((topic) => (
            <TopicCard
              key={`${topic.id}-${topic.content_id ?? topic.topic_id}`}
              topic={topic}
              now={topics._time ?? profile._time}
            />
          ))}
        </div>

        {!topics.topicList.length && (
          <div className="empty-state">
            <MessageSquareText size={28} />
            <h2>还没有公开主题</h2>
            <p>这位用户暂时没有可展示的发布记录。</p>
          </div>
        )}

        <Pagination
          current={topics.currPage}
          max={topics.maxPage}
          path={`/user/${uid}`}
        />
      </section>
    </main>
  );
}
