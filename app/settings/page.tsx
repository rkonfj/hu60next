import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/account/account-settings";
import {
  getAccountProfile,
  getUserProfile,
  getUserStatus
} from "@/lib/hu60";

export const metadata: Metadata = { title: "账号设置" };

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const status = await getUserStatus(sid);
  if (!status.uid || status.isLogin !== true) {
    redirect("/login?next=/settings");
  }

  const [account, profile] = await Promise.all([
    getAccountProfile(sid),
    getUserProfile(status.uid)
  ]);

  return (
    <main className="page-shell narrow-page content-page settings-page">
      <header className="settings-heading">
        <span className="eyebrow">
          <Settings size={14} /> 我的账号
        </span>
        <h1>账号设置</h1>
        <p>
          <span data-member-uid={status.uid}>{status.name}</span>
          ，在这里管理头像、资料和密码。
        </p>
      </header>
      <div className="settings-sections">
        <section className="settings-card">
          <header>
            <Settings size={18} />
            <div>
              <h2>网页插件</h2>
              <p>管理账号下的 HTML / CSS / JavaScript 插件，与虎绿林原版数据同步。</p>
            </div>
          </header>
          <Link href="/settings/webplugs" className="settings-inline-link">
            打开网页插件管理
          </Link>
        </section>
        <AccountSettings
          name={status.name || account.name || "虎绿林用户"}
          avatar={profile._u_avatar}
          signature={account.signature}
          contact={account.contact}
        />
      </div>
    </main>
  );
}
