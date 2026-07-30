import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountFloorOrderSetting } from "@/components/account/account-floor-order-setting";
import { AccountSettings } from "@/components/account/account-settings";
import { isFloorReverseEnabled } from "@/lib/floor-order";
import {
  getAccountProfile,
  getUserProfile,
  getUserStatus
} from "@/lib/hu60";

export const metadata: Metadata = { title: "账号设置" };

type SettingsPageProps = {
  searchParams: Promise<{
    floorOrder?: string;
    floorOrderError?: string;
  }>;
};

export default async function SettingsPage({
  searchParams
}: SettingsPageProps) {
  const [query, cookieStore] = await Promise.all([searchParams, cookies()]);
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const status = await getUserStatus(sid);
  if (!status.uid || status.isLogin !== true) {
    redirect("/login?next=/settings");
  }

  const [account, profile] = await Promise.all([
    getAccountProfile(sid),
    getUserProfile(status.uid)
  ]);
  const floorReverse = isFloorReverseEnabled(account.floorReverse);
  const floorOrderNotice =
    query.floorOrder === "asc"
      ? { kind: "success" as const, text: "默认排序已设为正序。" }
      : query.floorOrder === "desc"
        ? { kind: "success" as const, text: "默认排序已设为倒序。" }
        : query.floorOrderError
          ? {
              kind: "error" as const,
              text:
                query.floorOrderError === "1"
                  ? "楼层排序偏好保存失败，请稍后重试。"
                  : query.floorOrderError
            }
          : null;

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
      {floorOrderNotice ? (
        <p className={`settings-notice ${floorOrderNotice.kind}`}>
          {floorOrderNotice.text}
        </p>
      ) : null}
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
        <AccountFloorOrderSetting floorReverse={floorReverse} />
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
