import { Database, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CacheDashboard } from "@/components/cache-dashboard";
import { getCacheDashboardData } from "@/lib/cache-admin";
import { getUserStatus } from "@/lib/hu60";
import { hasModeratorPermission } from "@/lib/moderator";

export const metadata: Metadata = {
  title: "缓存管理",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function CachePage() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  if (!sid) redirect("/login?next=/cache");

  const session = await getUserStatus(sid);
  if (
    session.isLogin !== true ||
    !hasModeratorPermission(session.permissions)
  ) {
    notFound();
  }

  return (
    <main className="page-shell narrow-page content-page cache-page">
      <header className="cache-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={14} />
            MOD 工具
          </span>
          <h1>缓存管理</h1>
          <p>查看当前服务器实例的内存缓存，并记录手动刷新访问的上游接口。</p>
        </div>
        <Database size={28} aria-hidden="true" />
      </header>
      <CacheDashboard initialData={getCacheDashboardData()} />
    </main>
  );
}
