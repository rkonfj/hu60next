"use client";

import { LoaderCircle, Reply } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ReplyFormProps = {
  topicId: number;
  token: string;
  initialNotice?: string;
};

export function ReplyForm({
  topicId,
  token,
  initialNotice = ""
}: ReplyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    setSuccess(false);

    const form = event.currentTarget;
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form)
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };

      if (!response.ok || !result.success) {
        setNotice(result.notice || "回复失败，请稍后再试。");
        return;
      }

      form.reset();
      setSuccess(true);
      setNotice("回复已发布。");
      router.refresh();
    } catch {
      setNotice("暂时无法提交回复，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="quick-reply reply-composer"
      id="quick-reply"
      method="post"
      action={`/api/topics/${topicId}/replies`}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <strong>加入这场讨论</strong>
        <span>已识别登录状态，回复将发布到原社区。</span>
      </div>
      <textarea
        name="content"
        required
        minLength={1}
        maxLength={20000}
        placeholder="写下你的回复…"
        aria-label="回复内容"
      />
      <div className="reply-composer-footer">
        {notice ? (
          <p className={success ? "reply-success" : "form-notice"}>
            {notice}
          </p>
        ) : (
          <span>支持虎绿林 UBB 与 Markdown 标记</span>
        )}
        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle className="spin" size={16} /> 正在发布
            </>
          ) : (
            <>
              发布回复 <Reply size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
