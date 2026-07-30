import { Puzzle } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WebPlugManager } from "@/components/webplug/webplug-manager";
import { getUserStatus } from "@/lib/hu60";
import { listWebPlugs } from "@/lib/webplug";

export const metadata: Metadata = { title: "网页插件" };

export default async function WebPlugsSettingsPage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const status = await getUserStatus(sid);
  if (!status.uid || status.isLogin !== true) {
    redirect("/login?next=/settings/webplugs");
  }

  const list = await listWebPlugs(sid);

  return (
    <main className="page-shell narrow-page content-page settings-page">
      <header className="settings-heading">
        <span className="eyebrow">
          <Puzzle size={14} /> 网页插件
        </span>
        <h1>网页插件管理</h1>
        <p>
          <span data-member-uid={status.uid}>{status.name}</span>
          ，管理在虎绿林账号下保存的网页插件。启用中的插件会在浏览站点时自动加载。
        </p>
      </header>
      <WebPlugManager initialPlugins={list.data ?? []} />
    </main>
  );
}
