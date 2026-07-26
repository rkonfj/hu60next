import { PenLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Composer } from "@/components/compose/composer";
import { getFaces, getNewTopicForm } from "@/lib/hu60";

export const metadata: Metadata = { title: "发起讨论" };

export default async function ComposePage() {
  const [form, faces] = await Promise.all([
    getNewTopicForm(),
    getFaces()
  ]);

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
      {form.__fallback ? (
        <div className="data-notice">
          暂时无法读取发布板块。编辑和本地草稿仍可使用，恢复连接后再发布。
        </div>
      ) : null}
      <Composer
        rootForums={form.forums}
        isLogin={form.isLogin === true}
        faces={faces}
      />
    </main>
  );
}
