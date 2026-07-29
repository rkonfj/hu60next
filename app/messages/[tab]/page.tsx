import {
  AtSign,
  CheckCircle2,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  Send
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import {
  ChatComposer,
  MarkMessagesRead,
  PrivateMessageForm
} from "@/components/messages/message-actions";
import { Pagination } from "@/components/pagination";
import { fullDate, relativeTime } from "@/lib/format";
import { getMessages, getPublicChat, getUserStatus } from "@/lib/hu60";
import { sanitizeHu60Content } from "@/lib/sanitize";
import type { ChatItem, MessageItem } from "@/lib/types";

type MessageTab = "inbox" | "mentions" | "sent" | "chat";

type MessagesPageProps = {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ page?: string }>;
};

const tabMeta: Record<
  MessageTab,
  { label: string; title: string; icon: typeof Inbox }
> = {
  inbox: { label: "私信", title: "私信", icon: Inbox },
  mentions: { label: "提醒", title: "提醒", icon: AtSign },
  sent: { label: "已发送", title: "已发送", icon: Send },
  chat: { label: "聊天室", title: "公共聊天室", icon: MessageSquareText }
};

export async function generateMetadata({
  params
}: MessagesPageProps): Promise<Metadata> {
  const { tab } = await params;
  return { title: tab in tabMeta ? tabMeta[tab as MessageTab].title : "消息中心" };
}

function isMessageTab(value: string): value is MessageTab {
  return (
    value === "inbox" ||
    value === "mentions" ||
    value === "sent" ||
    value === "chat"
  );
}

function UserIdentity({
  uid,
  name,
  avatar
}: {
  uid: number;
  name?: string | null;
  avatar?: string | null;
}) {
  const content = (
    <>
      <Avatar src={avatar} name={name} size="md" />
      <strong data-member-uid={uid}>{name || `用户 ${uid}`}</strong>
    </>
  );

  return uid > 0 ? (
    <Link href={`/user/${uid}`} className="message-author">
      {content}
    </Link>
  ) : (
    <span className="message-author">{content}</span>
  );
}

function MessageCard({
  message,
  now,
  sent = false
}: {
  message: MessageItem;
  now?: number;
  sent?: boolean;
}) {
  const uid = sent ? message.touid : message.byuid;
  const name = sent
    ? message.to_u_name || message.toUinfo?.name
    : message.by_u_name || message.byUinfo?.name;
  const avatar = sent ? message.to_u_avatar : message.by_u_avatar;
  return (
    <article
      className={`message-card${message.isread ? "" : " unread"}`}
      id={`message-${message.id}`}
    >
      <header>
        <UserIdentity
          uid={uid}
          name={name}
          avatar={avatar}
        />
        <time dateTime={new Date(message.ctime * 1000).toISOString()}>
          {relativeTime(message.ctime, now)}
        </time>
      </header>
      <div
        className="message-content rich-content"
        data-math-content
        dangerouslySetInnerHTML={{
          __html: sanitizeHu60Content(message.content)
        }}
      />
      <footer>
        {!message.isread ? (
          <span>
            <i />
            未读
          </span>
        ) : (
          <span>
            <CheckCircle2 size={13} />
            已读
          </span>
        )}
        <time title={fullDate(message.ctime)}>{fullDate(message.ctime)}</time>
      </footer>
    </article>
  );
}

function ChatCard({ item, now }: { item: ChatItem; now?: number }) {
  return (
    <article className="chat-message" id={`chat-${item.lid}`}>
      <header>
        <UserIdentity
          uid={item.uid}
          name={item._u_name}
          avatar={item._u_avatar}
        />
        <div className="chat-message-meta">
          <a href={`#chat-${item.lid}`}>#{item.lid}</a>
          <time title={fullDate(item.time)}>
            {relativeTime(item.time, now)}
          </time>
        </div>
      </header>
      <div
        className="chat-message-content rich-content"
        data-math-content
        dangerouslySetInnerHTML={{
          __html: sanitizeHu60Content(item.content)
        }}
      />
    </article>
  );
}

export default async function MessageTabPage({
  params,
  searchParams
}: MessagesPageProps) {
  const [{ tab }, query] = await Promise.all([params, searchParams]);
  if (!isMessageTab(tab)) notFound();

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const status = await getUserStatus(sid);

  if (!status.uid && status.isLogin !== true) {
    return (
      <main className="page-shell narrow-page">
        <div className="empty-state locked-state">
          <LockKeyhole size={32} />
          <h1>登录后查看消息</h1>
          <p>私信、@提醒和聊天室动态只会对当前账号显示。</p>
          <Link href={`/login?next=/messages/${tab}`}>前往登录</Link>
        </div>
      </main>
    );
  }

  const page = Math.max(1, Number(query.page) || 1);
  const data =
    tab === "chat"
      ? await getPublicChat(page, sid)
      : await getMessages(tab, page, sid);
  const current = tabMeta[tab];
  const CurrentIcon = current.icon;

  return (
    <main className="page-shell content-page message-center-page">
      <header className="message-center-heading">
        <div>
          <span className="eyebrow">
            <CurrentIcon size={14} />
            {status.name ? (
              <span data-member-uid={status.uid}>{status.name}</span>
            ) : (
              "消息中心"
            )}
          </span>
          <h1>{current.title}</h1>
        </div>
        <p>登录状态实时同步至 hu60。</p>
      </header>

      <nav className="message-tabs" aria-label="消息分类">
        {(Object.keys(tabMeta) as MessageTab[]).map((key) => {
          const item = tabMeta[key];
          const Icon = item.icon;
          const count =
            key === "inbox"
              ? Number(status.newMsg || 0)
              : key === "mentions"
                ? Number(status.newAtInfo || 0)
                : 0;
          return (
            <Link
              href={`/messages/${key}`}
              className={tab === key ? "active" : undefined}
              key={key}
            >
              <Icon size={16} />
              {item.label}
              {count > 0 ? <span>{count}</span> : null}
            </Link>
          );
        })}
      </nav>

      {data.__fallback ? (
        <div className="data-notice">
          暂时无法读取消息数据，请稍后刷新。
        </div>
      ) : null}

      {tab === "chat" && "chatList" in data ? (
        <div className="message-center-layout chat-layout">
          <section className="message-list-panel">
            <header className="message-panel-heading">
              <div>
                <strong>{data.chatRomName}</strong>
                <span>{data.chatCount} 条发言</span>
              </div>
            </header>
            <div className="chat-message-list">
              {data.chatList.map((item) => (
                <ChatCard item={item} now={data._time} key={item.id} />
              ))}
            </div>
            {!data.chatList.length ? (
              <div className="message-empty">暂无聊天消息。</div>
            ) : null}
            <Pagination
              current={data.currPage}
              max={data.maxPage}
              path="/messages/chat"
            />
          </section>
          <aside>
            {data.token && data.isLogin === true && !data.blockedReply ? (
              <ChatComposer token={data.token} autoRefresh={page === 1} />
            ) : (
              <div className="message-side-note">当前账号暂时不能在这里发言。</div>
            )}
          </aside>
        </div>
      ) : "msgList" in data ? (
        <>
          <header className="message-panel-heading">
            <div>
              <strong>{current.title}</strong>
              <span>{data.msgCount} 条消息</span>
            </div>
            <MarkMessagesRead
              type={tab === "inbox" ? 0 : 1}
              unread={
                tab === "inbox"
                  ? Number(status.newMsg || 0)
                  : Number(status.newAtInfo || 0)
              }
            />
          </header>
          <div
            className={`message-center-layout${tab === "mentions" ? " single" : ""}`}
          >
            <section className="message-list-panel">
              <div className="message-list">
                {data.msgList.map((message) => (
                  <MessageCard
                    message={message}
                    now={data._time}
                    sent={tab === "sent"}
                    key={message.id}
                  />
                ))}
              </div>
              {!data.msgList.length ? (
                <div className="message-empty">这里还没有消息。</div>
              ) : null}
              <Pagination
                current={data.currPage}
                max={data.maxPage}
                path={`/messages/${tab}`}
              />
            </section>
            {tab === "inbox" ? (
              <aside>
                <PrivateMessageForm />
              </aside>
            ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}
