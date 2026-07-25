import { PenLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Composer } from "@/components/compose/composer";

export const metadata: Metadata = { title: "发起讨论" };

export default function ComposePage() {
  return (
    <main className="page-shell narrow-page compose-page">
      <header className="page-heading">
        <span className="eyebrow">
          <PenLine size={14} />
          发起新话题
        </span>
        <h1>分享你的发现</h1>
        <p>提供足够的背景和细节，让真正懂这个问题的人更容易参与。</p>
      </header>
      <div className="compose-tip">
        <Sparkles size={17} />
        <p>
          当前版本已支持本地草稿和预览。向原站发布需要登录后完成表单联调。
        </p>
      </div>
      <Composer />
    </main>
  );
}
