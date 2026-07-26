import {
  Bell,
  Bookmark,
  LogOut,
  MessageSquareText,
  PenLine,
  Settings,
  Trophy,
  UserRound
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserStatus } from "@/lib/hu60";

export const metadata: Metadata = { title: "我的" };

export default async function MePage() {
  const cookieStore = await cookies();
  const status = await getUserStatus(
    cookieStore.get("hulvlin_sid")?.value
  );

  if (!status.uid && status.isLogin !== true) {
    redirect("/login?next=/me");
  }

  const unread = Number(status.newMsg || 0) + Number(status.newAtInfo || 0);

  return (
    <main className="page-shell narrow-page content-page account-page">
      <section className="account-summary">
        <span className="account-avatar" aria-hidden="true">
          <UserRound size={30} />
        </span>
        <div>
          <span className="eyebrow">我的账号</span>
          <h1>{status.name || "hu60 用户"}</h1>
          <p>UID {status.uid ?? "—"}</p>
        </div>
        <form action="/api/logout" method="post">
          <button type="submit">
            <LogOut size={16} /> 退出登录
          </button>
        </form>
      </section>

      <div className="account-links">
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
