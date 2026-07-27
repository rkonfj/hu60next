import {
  CalendarDays,
  MessageCircle,
  MessageSquareText,
  UserRound
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Pagination } from "@/components/pagination";
import { TopicCard } from "@/components/topic-card";
import { UserRelationshipActions } from "@/components/user-relationship-actions";
import { fullDate, relativeTime } from "@/lib/format";
import {
  getUserProfile,
  getUserReplies,
  getUserStatus,
  getUserTopics
} from "@/lib/hu60";
import { getMemberTitle } from "@/lib/member";
import { sanitizeHu60Content } from "@/lib/sanitize";

type UserProfileTab = "topics" | "replies";

function topicReplyHref(topicId: number, floor: number) {
  const page = Math.floor(Math.max(0, floor) / 30) + 1;
  return `/topic/${topicId}${page > 1 ? `?page=${page}` : ""}#floor-${floor}`;
}

export async function UserProfileView({
  uid,
  page,
  activeTab
}: {
  uid: number;
  page: number;
  activeTab: UserProfileTab;
}) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const [profile, status] = await Promise.all([
    getUserProfile(uid),
    getUserStatus(sid)
  ]);

  if (profile.__fallback) {
    return (
      <main className="page-shell content-page user-page">
        <div className="data-notice">
          暂时无法读取用户资料，请稍后刷新重试。
        </div>
        <div className="empty-state">
          <UserRound size={30} />
          <h1>用户主页暂时不可用</h1>
          <p>没有使用离线资料或示例内容代替真实数据。</p>
        </div>
      </main>
    );
  }

  const displayName = profile.name || profile._u_name || `用户 ${uid}`;
  const topics =
    activeTab === "topics"
      ? await getUserTopics(displayName, page)
      : null;
  const replies =
    activeTab === "replies"
      ? await getUserReplies(displayName, page)
      : null;
  const data = topics ?? replies;
  if (!data) return null;
  const signature =
    profile.signature || profile._u_signature || "这位用户还没有留下个人签名。";
  const memberTitle = getMemberTitle(profile.regtime);
  const itemCount = replies?.replyCount ?? topics?.topicCount ?? 0;

  return (
    <main className="page-shell content-page user-page">
      <section className="user-profile-card">
        <Avatar src={profile._u_avatar} name={displayName} size="xl" />
        <div className="user-profile-copy">
          <span className="eyebrow">
            <UserRound size={14} />
            用户主页
          </span>
          <div className="user-profile-title">
            <h1 data-member-uid={uid}>{displayName}</h1>
            {memberTitle ? (
              <span className="member-badge">{memberTitle}</span>
            ) : null}
          </div>
          <p>{signature}</p>
          {profile.contact ? (
            <p className="user-profile-contact">{profile.contact}</p>
          ) : null}
        </div>
        <div className="user-profile-stats">
          <span>
            <strong>{data.__fallback ? "—" : itemCount}</strong>
            {activeTab === "replies" ? "回复" : "主题"}
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
          <UserRelationshipActions
            uid={uid}
            isLoggedIn={status.isLogin === true}
            isSelf={status.uid === uid}
            initialFollow={profile.isFollow === true}
            initialBlock={profile.isBlock === true}
          />
        </div>
      </section>

      <nav className="profile-tabs" aria-label="用户内容">
        <Link
          href={`/user/${uid}`}
          className={activeTab === "topics" ? "active" : ""}
          aria-current={activeTab === "topics" ? "page" : undefined}
        >
          <MessageSquareText size={15} />
          主题
        </Link>
        <Link
          href={`/user/${uid}/replies`}
          className={activeTab === "replies" ? "active" : ""}
          aria-current={activeTab === "replies" ? "page" : undefined}
        >
          <MessageCircle size={15} />
          回复
        </Link>
      </nav>

      <section className="user-topic-section">
        <header className="user-topic-heading">
          <div>
            <span className="eyebrow">
              {activeTab === "replies" ? (
                <MessageCircle size={14} />
              ) : (
                <MessageSquareText size={14} />
              )}
              发布记录
            </span>
            <h2>{activeTab === "replies" ? "参与的回复" : "发布的主题"}</h2>
          </div>
          <span>第 {data.currPage} 页</span>
        </header>

        {data.__fallback ? (
          <div className="data-notice">
            暂时无法读取{activeTab === "replies" ? "回复" : "主题"}列表，请稍后刷新。
          </div>
        ) : topics ? (
          <>
            <div className="topic-list">
              {topics.topicList.map((topic) => (
                <TopicCard
                  key={`${topic.id}-${topic.content_id ?? topic.topic_id}`}
                  topic={topic}
                  now={topics._time ?? profile._time}
                />
              ))}
            </div>
            {!topics.topicList.length ? (
              <div className="empty-state">
                <MessageSquareText size={28} />
                <h2>还没有公开主题</h2>
                <p>这位用户暂时没有可展示的发布记录。</p>
              </div>
            ) : null}
          </>
        ) : replies ? (
          <>
            <div className="user-reply-list">
              {replies.replyList.map((reply) => (
                <article className="user-reply-card" key={reply.id}>
                  <header>
                    <div>
                      <span>回复了主题</span>
                      <Link href={`/topic/${reply.topic_id}`}>
                        {reply.topic.title}
                      </Link>
                    </div>
                    <Link href={topicReplyHref(reply.topic_id, reply.floor)}>
                      #{reply.floor}
                    </Link>
                  </header>
                  <div
                    className="rich-content user-reply-content"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHu60Content(reply.content)
                    }}
                  />
                  <footer>
                    <span>{relativeTime(reply.ctime, replies._time)}</span>
                    <Link href={topicReplyHref(reply.topic_id, reply.floor)}>
                      查看完整回复
                    </Link>
                  </footer>
                </article>
              ))}
            </div>
            {!replies.replyList.length ? (
              <div className="empty-state">
                <MessageCircle size={28} />
                <h2>还没有公开回复</h2>
                <p>这位用户暂时没有可展示的回复记录。</p>
              </div>
            ) : null}
          </>
        ) : null}

        {!data.__fallback ? (
          <Pagination
            current={data.currPage}
            max={data.maxPage}
            path={
              activeTab === "replies"
                ? `/user/${uid}/replies`
                : `/user/${uid}`
            }
          />
        ) : null}
      </section>
    </main>
  );
}
