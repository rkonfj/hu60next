import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell narrow-page">
      <div className="empty-state locked-state">
        <Compass size={34} />
        <h1>这里暂时没有内容</h1>
        <p>链接可能已经变更，也可能是对应页面仍在建设中。</p>
        <Link href="/explore/latest">返回社区首页</Link>
      </div>
    </main>
  );
}
