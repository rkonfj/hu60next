import { AtSign, Inbox, LockKeyhole, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getUserStatus } from "@/lib/hu60";

export const metadata: Metadata = { title: "消息中心" };

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const status = await getUserStatus(cookieStore.get("hulvlin_sid")?.value);

  if (!status.uid && status.isLogin !== true) {
    return (
      <main className="page-shell narrow-page">
        <div className="empty-state locked-state">
          <LockKeyhole size={32} />
          <h1>登录后查看消息</h1>
          <p>私信、@提醒和聊天室动态只会对当前账号显示。</p>
          <Link href="/login">前往登录</Link>
        </div>
      </main>
    );
  }

  const items = [
    {
      icon: Inbox,
      label: "私信",
      count: status.newMsg,
      href: "https://hu60.cn/q.php/msg.index.inbox.all.html"
    },
    {
      icon: AtSign,
      label: "@我的",
      count: status.newAtInfo,
      href: "https://hu60.cn/q.php/msg.index.@.html"
    },
    {
      icon: MessageSquareText,
      label: "聊天室",
      count: 0,
      href: "https://hu60.cn/q.php/addin.chat.%E5%85%AC%E5%85%B1%E8%81%8A%E5%A4%A9%E5%AE%A4.html"
    }
  ];

  return (
    <main className="page-shell narrow-page content-page">
      <header className="page-heading">
        <span className="eyebrow">
          <Inbox size={14} /> {status.name}
        </span>
        <h1>消息中心</h1>
        <p>聚合私信、@提醒和聊天室动态。</p>
      </header>
      <div className="message-grid">
        {items.map(({ icon: Icon, label, count, href }) => (
          <a href={href} target="_blank" rel="noreferrer" key={label}>
            <span className="message-icon">
              <Icon size={21} />
            </span>
            <div>
              <strong>{label}</strong>
              <p>{count ? `${count} 条未读消息` : "暂无未读消息"}</p>
            </div>
            {count > 0 && <span className="message-count">{count}</span>}
          </a>
        ))}
      </div>
    </main>
  );
}
