import {
  Clock3,
  Eye,
  LockKeyhole,
  MessageCircle,
  PencilLine,
  Reply,
  Sparkles
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FavoriteButton } from "@/components/favorite-button";
import { ModeratorBadge } from "@/components/moderator-badge";
import { Pagination } from "@/components/pagination";
import { ReplyForm } from "@/components/reply-form";
import { ReviewActions } from "@/components/reviews/review-actions";
import { compactNumber, fullDate, relativeTime } from "@/lib/format";
import {
  getFaces,
  getTopic,
  getUserProfile,
  getUserStatus,
  isTopicFavorite
} from "@/lib/hu60";
import { getMemberTitle } from "@/lib/member";
import {
  hasModeratorPermission,
  isModerator
} from "@/lib/moderator";
import {
  sanitizeHu60Content,
  sanitizeHu60ReviewContent
} from "@/lib/sanitize";

type TopicPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; replyError?: string }>;
};

export async function generateMetadata({
  params
}: TopicPageProps): Promise<Metadata> {
  const { id } = await params;
  const topic = await getTopic(Number(id));
  return {
    title: topic.tMeta.title,
    description: `${topic.fName}中的社区讨论`
  };
}

export default async function TopicPage({
  params,
  searchParams
}: TopicPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const topicId = Number(id);
  const page = Math.max(1, Number(query.page) || 1);
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const [topic, isFavorite, faces, session] = await Promise.all([
    getTopic(topicId, page, sid),
    isTopicFavorite(topicId, sid),
    getFaces(),
    getUserStatus(sid)
  ]);

  if (topic.__fallback) {
    return (
      <main className="page-shell topic-page">
        <div className="data-notice">
          暂时无法读取这个帖子，请稍后刷新重试。
        </div>
        <div className="empty-state">
          <MessageCircle size={30} />
          <h1>帖子暂时不可用</h1>
          <p>没有使用离线正文或模拟回复代替真实内容。</p>
          <Link href="/explore/active">返回发现页</Link>
        </div>
      </main>
    );
  }

  const [authorProfile, firstPageTopic] = await Promise.all([
    getUserProfile(topic.tMeta.uid),
    page === 1
      ? Promise.resolve(topic)
      : getTopic(topicId, 1, sid)
  ]);
  const authorMemberTitle = authorProfile.__fallback
    ? null
    : getMemberTitle(authorProfile.regtime);
  const mainFloor = firstPageTopic.tContents.find(
    (floor) => Number(floor.floor) === 0
  );
  const replies = topic.tContents.filter(
    (floor) => Number(floor.floor) > 0
  );
  const meta = topic.tMeta;
  const sessionUid = Number(session.uid);
  const canReview =
    session.isLogin === true &&
    session.permissions?.includes("PERMISSION_REVIEW_POST");
  const publishedAt = Number(mainFloor?.ctime ?? meta.ctime);
  const editedAt = Number(mainFloor?.mtime ?? publishedAt);
  const mainFloorEdited = editedAt !== publishedAt;
  const authorUid = Number(meta.uid);
  const moderatorEntries = await Promise.all(
    [...new Set([authorUid, ...replies.map((floor) => Number(floor.uid))])]
      .filter((uid) => uid > 0)
      .map(async (uid) => [
        uid,
        uid === authorUid
          ? hasModeratorPermission(authorProfile.permissions)
          : await isModerator(uid)
      ] as const)
  );
  const moderatorUids = new Map(moderatorEntries);

  return (
    <main className="page-shell topic-page">
      <div className="topic-layout">
        <div className="topic-content-column">
          <article
            className={`topic-article${
              canReview && Number(mainFloor?.review) === 1
                ? " is-pending-review"
                : ""
            }`}
          >
            {meta.essence || meta.locked ? (
              <div className="topic-labels">
                {meta.essence ? (
                  <span className="topic-state essence">
                    <Sparkles size={13} /> 精华
                  </span>
                ) : null}
                {meta.locked ? (
                  <span className="topic-state locked">
                    <LockKeyhole size={13} /> 已锁定
                  </span>
                ) : null}
              </div>
            ) : null}
            <h1>{meta.title}</h1>
            <div className="article-meta">
              <Link href={`/user/${meta.uid}`} className="article-author-avatar">
                <Avatar src={meta._u_avatar} name={meta._u_name} size="lg" />
              </Link>
              <div>
                <Link href={`/user/${meta.uid}`}>
                  <strong data-member-uid={meta.uid}>
                    {meta._u_name || `用户 ${meta.uid}`}
                  </strong>
                  <ModeratorBadge isModerator={moderatorUids.get(authorUid)} />
                </Link>
                <div className="article-author-subline">
                  <span
                    className="article-author-time"
                    title={fullDate(publishedAt)}
                  >
                    <Clock3 size={14} />
                    {relativeTime(publishedAt)}
                    {mainFloorEdited
                      ? ` · ${relativeTime(editedAt)}编辑`
                      : ""}
                  </span>
                  <Link
                    href={`/forum/${topic.fIndex.at(-1)?.id ?? 0}`}
                    className="forum-pill article-forum-pill"
                  >
                    {topic.fName}
                  </Link>
                </div>
              </div>
              <div className="article-stats">
                <span>
                  <Eye size={15} /> {compactNumber(meta.read_count)}
                </span>
                <span>
                  <MessageCircle size={15} /> {topic.floorCount - 1}
                </span>
              </div>
            </div>
            {mainFloor ? (
              <div
                className="rich-content"
                dangerouslySetInnerHTML={{
                  __html:
                    canReview && Number(mainFloor.review || 0) !== 0
                      ? sanitizeHu60ReviewContent(mainFloor.content)
                      : sanitizeHu60Content(mainFloor.content)
                }}
              />
            ) : (
              <p className="missing-content">帖子正文暂时无法显示。</p>
            )}
            <div className="article-actions">
              <FavoriteButton
                topicId={topicId}
                isLoggedIn={topic.isLogin === true}
                initialFavorite={isFavorite}
              />
              {mainFloor &&
              sessionUid > 0 &&
              sessionUid === Number(mainFloor.uid) &&
              !mainFloor.locked ? (
                <Link
                  href={`/topic/${topicId}/edit/${mainFloor.id}${
                    page > 1 ? `?page=${page}` : ""
                  }`}
                >
                  <PencilLine size={14} /> 修改
                </Link>
              ) : null}
            </div>
            {canReview &&
            (Number(mainFloor?.review || 0) !== 0 ||
              Boolean(mainFloor?.review_log?.length)) &&
            mainFloor ? (
              <ReviewActions
                contentId={mainFloor.id}
                reviewState={mainFloor.review}
                logs={mainFloor.review_log}
                context={{ type: "topic", topicId, page }}
              />
            ) : null}
          </article>

          <section className="reply-section" id="replies">
            <div className="reply-heading">
              <div>
                <span className="eyebrow">
                  <MessageCircle size={14} />
                  楼层讨论
                </span>
                <h2>{topic.floorCount - 1} 条回复</h2>
              </div>
              <span>默认正序</span>
            </div>
            <div className="reply-list">
              {replies.map((floor) => (
                <article
                  className={`reply-card${
                    canReview && Number(floor.review) === 1
                      ? " is-pending-review"
                      : ""
                  }`}
                  id={`floor-${floor.floor}`}
                  key={floor.id}
                >
                  <div className="reply-author">
                    <Link href={`/user/${floor.uid}`}>
                      <Avatar
                        src={floor._u_avatar}
                        name={floor._u_name}
                        size="md"
                      />
                    </Link>
                    <div>
                      <Link href={`/user/${floor.uid}`}>
                        <strong data-member-uid={floor.uid}>
                          {floor._u_name || `用户 ${floor.uid}`}
                        </strong>
                        <ModeratorBadge
                          isModerator={moderatorUids.get(Number(floor.uid))}
                        />
                      </Link>
                      <span title={fullDate(floor.ctime)}>
                        {relativeTime(floor.ctime)}
                      </span>
                    </div>
                    <a href={`#floor-${floor.floor}`} className="floor-number">
                      #{floor.floor}
                    </a>
                  </div>
                  <div
                    className="rich-content reply-content"
                    dangerouslySetInnerHTML={{
                      __html:
                        canReview && Number(floor.review || 0) !== 0
                          ? sanitizeHu60ReviewContent(floor.content)
                          : sanitizeHu60Content(floor.content)
                    }}
                  />
                  <div className="reply-actions">
                    {sessionUid > 0 &&
                    sessionUid === Number(floor.uid) &&
                    !floor.locked ? (
                      <Link
                        href={`/topic/${topicId}/edit/${floor.id}${
                          page > 1 ? `?page=${page}` : ""
                        }`}
                      >
                        <PencilLine size={14} /> 修改
                      </Link>
                    ) : null}
                    {topic.canReply ? (
                      <a
                        href="#quick-reply"
                        data-reply-author={floor._u_name || String(floor.uid)}
                        data-reply-floor={floor.floor}
                        aria-label={`回复${floor._u_name || `用户 ${floor.uid}`}`}
                      >
                        <Reply size={14} /> 回复
                      </a>
                    ) : null}
                  </div>
                  {canReview &&
                  (Number(floor.review || 0) !== 0 ||
                    Boolean(floor.review_log?.length)) ? (
                    <ReviewActions
                      contentId={floor.id}
                      reviewState={floor.review}
                      logs={floor.review_log}
                      context={{ type: "topic", topicId, page }}
                    />
                  ) : null}
                </article>
              ))}
            </div>
            {!replies.length && (
              <div className="empty-replies">
                <MessageCircle size={24} />
                <p>还没有回复，来留下第一个观点。</p>
              </div>
            )}
          </section>

          <Pagination
            current={topic.currPage}
            max={topic.maxPage}
            path={`/topic/${topicId}`}
          />

          {topic.canReply && topic.token ? (
            <ReplyForm
              topicId={topicId}
              userId={sessionUid}
              token={topic.token}
              faces={faces}
              initialNotice={
                query.replyError ? "回复失败，请检查内容后重试。" : ""
              }
            />
          ) : topic.isLogin ? (
            <div className="quick-reply" id="quick-reply">
              <div>
                <strong>当前帖子不可回复</strong>
                <span>帖子可能已锁定或限制了回复权限。</span>
              </div>
            </div>
          ) : (
            <div className="quick-reply" id="quick-reply">
              <div>
                <strong>加入这场讨论</strong>
                <span>登录后即可参与讨论</span>
              </div>
              <Link href={`/login?next=/topic/${topicId}`}>
                登录并回复 <Reply size={16} />
              </Link>
            </div>
          )}
        </div>

        <aside className="topic-aside">
          <section className="author-card">
            <span className="aside-label">关于作者</span>
            <Link href={`/user/${meta.uid}`} className="author-card-identity">
              <Avatar src={meta._u_avatar} name={meta._u_name} size="xl" />
              <span className="author-card-name">
                <strong data-member-uid={meta.uid}>
                  {meta._u_name || `用户 ${meta.uid}`}
                </strong>
                <ModeratorBadge isModerator={moderatorUids.get(authorUid)} />
                {authorMemberTitle ? (
                  <span className="member-badge author-member-badge">
                    {authorMemberTitle}
                  </span>
                ) : null}
              </span>
            </Link>
            <p>{meta._u_signature || "这位用户还没有留下个人签名。"}</p>
            <Link href={`/user/${meta.uid}`} className="author-card-link">
              查看用户主页
            </Link>
          </section>
          <section className="topic-info-card">
            <span className="aside-label">帖子信息</span>
            <div>
              <span>发布于</span>
              <strong>{fullDate(meta.ctime)}</strong>
            </div>
            <div>
              <span>最后更新</span>
              <strong>{fullDate(meta.mtime)}</strong>
            </div>
            <div>
              <span>阅读</span>
              <strong>{compactNumber(meta.read_count)}</strong>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
