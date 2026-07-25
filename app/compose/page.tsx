import { PenLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Composer } from "@/components/compose/composer";
import { getNewTopicForm } from "@/lib/hu60";

export const metadata: Metadata = { title: "发起讨论" };

export default async function ComposePage() {
  const form = await getNewTopicForm();

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
          支持多级板块、实时预览、本地草稿和附件上传。
        </p>
      </div>
      <Composer
        rootForums={form.forums}
        isLogin={form.isLogin === true}
        token={form.token}
      />
    </main>
  );
}
