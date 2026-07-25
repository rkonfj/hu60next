"use client";

import { CheckCheck, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type ActionResult = {
  success?: boolean;
  notice?: string;
};

export function MarkMessagesRead({
  type,
  unread
}: {
  type: 0 | 1;
  unread: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  if (unread <= 0) return null;

  async function markRead() {
    setLoading(true);
    setNotice("");

    try {
      const body = new FormData();
      body.set("type", String(type));
      const response = await fetch("/api/messages/read", {
        method: "POST",
        body
      });
      const result = (await response.json()) as ActionResult;
      setNotice(result.notice || (response.ok ? "已设为已读。" : "操作失败。"));
      if (response.ok && result.success) router.refresh();
    } catch {
      setNotice("网络请求失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="message-read-action">
      <button type="button" onClick={markRead} disabled={loading}>
        {loading ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <CheckCheck size={15} />
        )}
        全部已读
      </button>
      {notice ? <span role="status">{notice}</span> : null}
    </div>
  );
}

export function PrivateMessageForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      const result = (await response.json()) as ActionResult;
      const sent = response.ok && result.success === true;
      setSuccess(sent);
      setNotice(result.notice || (sent ? "私信已发送。" : "发送失败。"));
      if (sent) {
        form.reset();
        router.refresh();
      }
    } catch {
      setNotice("网络请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="message-compose-form"
      action="/api/messages/send"
      method="post"
      onSubmit={submit}
    >
      <div>
        <strong>发送私信</strong>
        <span>使用用户名指定收件人</span>
      </div>
      <label>
        <span>收件人</span>
        <input
          type="text"
          name="name"
          required
          maxLength={60}
          autoComplete="off"
          placeholder="输入用户名"
        />
      </label>
      <label>
        <span>内容</span>
        <textarea
          name="content"
          required
          maxLength={20000}
          placeholder="写一条私信…"
        />
      </label>
      {notice ? (
        <p className={success ? "reply-success" : "form-notice"} role="status">
          {notice}
        </p>
      ) : null}
      <button type="submit" disabled={loading}>
        {loading ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Send size={15} />
        )}
        {loading ? "发送中" : "发送"}
      </button>
    </form>
  );
}

export function ChatComposer({
  token,
  autoRefresh
}: {
  token: string;
  autoRefresh: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      const result = (await response.json()) as ActionResult;
      const sent = response.ok && result.success === true;
      setSuccess(sent);
      setNotice(result.notice || (sent ? "消息已发送。" : "发送失败。"));
      if (sent) {
        setContent("");
        router.refresh();
      }
    } catch {
      setNotice("网络请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="chat-compose-form"
      action="/api/chat/send"
      method="post"
      onSubmit={submit}
    >
      <input type="hidden" name="token" value={token} />
      <div className="chat-compose-heading">
        <div>
          <strong>公共聊天室</strong>
          <span>{autoRefresh ? "每 15 秒自动刷新" : "历史消息页"}</span>
        </div>
      </div>
      <textarea
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        required
        maxLength={20000}
        placeholder="说点什么…"
      />
      <div className="chat-compose-footer">
        {notice ? (
          <p className={success ? "reply-success" : "form-notice"} role="status">
            {notice}
          </p>
        ) : (
          <span>支持虎绿林 UBB 与 Markdown 标记</span>
        )}
        <button type="submit" disabled={loading}>
          {loading ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Send size={15} />
          )}
          {loading ? "发送中" : "发送"}
        </button>
      </div>
    </form>
  );
}
