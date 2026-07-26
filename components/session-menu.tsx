import {
  Bell,
  LogIn,
  LogOut
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { DesktopUserMenu } from "@/components/desktop-user-menu";
import { getUserStatus } from "@/lib/hu60";

export async function SessionMenu() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const session = await getUserStatus(sid);

  if (!session.uid && session.isLogin !== true) {
    return (
      <Link href="/login" className="header-login">
        <LogIn size={17} />
        <span>登录</span>
      </Link>
    );
  }

  const unread = Number(session.newMsg || 0) + Number(session.newAtInfo || 0);

  return (
    <div className="session-actions">
      <Link href="/messages/inbox" className="icon-button" aria-label="消息">
        <Bell size={18} />
        {unread > 0 && <span className="notification-dot">{unread}</span>}
      </Link>
      <DesktopUserMenu
        userId={Number(session.uid)}
        userName={session.name || "已登录"}
      />
      <form action="/api/logout" method="post">
        <button className="icon-button" type="submit" aria-label="退出登录">
          <LogOut size={17} />
        </button>
      </form>
    </div>
  );
}
