import {
  Clock3,
  Eye,
  Flame,
  LockKeyhole,
  MessageCircle,
  Reply
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FavoriteButton } from "@/components/favorite-button";
import { Pagination } from "@/components/pagination";
import { ReplyForm } from "@/components/reply-form";
import { compactNumber, fullDate, relativeTime } from "@/lib/format";
import { getTopic, isTopicFavorite } from "@/lib/hu60";
import { sanitizeHu60Content } from "@/lib/sanitize";

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
  const [topic, isFavorite] = await Promise.all([
    getTopic(topicId, page, sid),
    isTopicFavorite(topicId, sid)
  ]);
  const [mainFloor, ...replies] = topic.tContents;
  const meta = topic.tMeta;

  return (
    <main className="page-shell topic-page">
      {topic.__fallback && (
        <div className="data-notice">
          暂时无法读取这个帖子，正在展示安全的离线示例。
        </div>
      )}

      <div className="topic-layout">
        <div className="topic-content-column">
          <article className="topic-article">
            {meta.essence || meta.locked ? (
              <div className="topic-labels">
                {meta.essence ? (
                  <span className="topic-state essence">
                    <Flame size={13} /> 精华
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
                  <strong>{meta._u_name || `用户 ${meta.uid}`}</strong>
                </Link>
                <div className="article-author-subline">
                  <span
                    className="article-author-time"
                    title={fullDate(meta.ctime)}
                  >
                    <Clock3 size={14} />
                    {relativeTime(meta.ctime)}
                    {meta.mtime !== meta.ctime && " · 已编辑"}
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
                  __html: sanitizeHu60Content(mainFloor.content)
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
            </div>
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
                <article className="reply-card" id={`floor-${floor.floor}`} key={floor.id}>
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
                        <strong>{floor._u_name || `用户 ${floor.uid}`}</strong>
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
                      __html: sanitizeHu60Content(floor.content)
                    }}
                  />
                  <div className="reply-actions">
                    {topic.canReply ? (
                      <a href="#quick-reply">
                        <Reply size={14} /> 回复
                      </a>
                    ) : null}
                  </div>
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

          {topic.canReply && topic.token ? (
            <ReplyForm
              topicId={topicId}
              token={topic.token}
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

          <Pagination
            current={topic.currPage}
            max={topic.maxPage}
            path={`/topic/${topicId}`}
          />
        </div>

        <aside className="topic-aside">
          <section className="author-card">
            <span className="aside-label">关于作者</span>
            <Link href={`/user/${meta.uid}`} className="author-card-identity">
              <Avatar src={meta._u_avatar} name={meta._u_name} size="xl" />
              <strong>{meta._u_name || `用户 ${meta.uid}`}</strong>
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
