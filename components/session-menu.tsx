import {
  LogIn
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { DesktopUserMenu } from "@/components/desktop-user-menu";
import { MessageNotificationLink } from "@/components/unread-badge";
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

  return (
    <div className="session-actions">
      <MessageNotificationLink
        initialNewMsg={Number(session.newMsg || 0)}
        initialNewAtInfo={Number(session.newAtInfo || 0)}
      />
      <DesktopUserMenu
        userId={Number(session.uid)}
        userName={session.name || "已登录"}
        canReview={session.permissions?.includes("PERMISSION_REVIEW_POST")}
      />
    </div>
  );
}
