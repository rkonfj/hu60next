"use client";

import {
  Check,
  CheckSquare2,
  FileText,
  MessageCircle,
  Square,
  X,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  ReviewActions,
  type ReviewActionContext
} from "@/components/reviews/review-actions";
import { relativeTime } from "@/lib/format";
import type { ReviewQueueFilter } from "@/lib/hu60";
import { isHu60MarkdownContent } from "@/lib/markdown";
import type { UserReply } from "@/lib/types";

export type ReviewQueueDisplayItem = UserReply & {
  safeContent: string;
};

type BatchDecision = "pass" | "reject";

export function ReviewQueue({
  initialItems,
  page,
  filter
}: {
  initialItems: ReviewQueueDisplayItem[];
  page: number;
  filter: ReviewQueueFilter;
}) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [decision, setDecision] = useState<BatchDecision | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const actionableIds = useMemo(
    () =>
      items
        .filter((item) => Number(item.review || 0) !== 0)
        .map((item) => item.id),
    [items]
  );
  const selectedCount = selected.size;
  const allSelected =
    actionableIds.length > 0 &&
    actionableIds.every((contentId) => selected.has(contentId));
  const context: ReviewActionContext = {
    type: "queue",
    page,
    filter
  };

  function toggleItem(contentId: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(actionableIds)
    );
  }

  function removeReviewed(contentId: number) {
    setItems((current) => current.filter((item) => item.id !== contentId));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(contentId);
      return next;
    });
  }

  async function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || selectedCount < 1) return;
    if (decision === "reject" && !reason.trim()) {
      setNotice("批量审核不通过时必须填写理由。");
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch("/api/reviews/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          context,
          items: Array.from(selected).map((contentId) => ({
            contentId,
            decision,
            reason: reason.trim()
          }))
        })
      });
      const data = (await response.json()) as {
        notice?: string;
        results?: Array<{
          contentId: number;
          success: boolean;
          notice?: string;
        }>;
      };
      if (!response.ok || !data.results) {
        setNotice(data.notice || "批量审核提交失败。");
        return;
      }

      const succeeded = new Set(
        data.results
          .filter((result) => result.success)
          .map((result) => result.contentId)
      );
      const failed = data.results.filter((result) => !result.success);
      setItems((current) =>
        current.filter((item) => !succeeded.has(item.id))
      );
      setSelected(new Set(failed.map((result) => result.contentId)));
      setDecision(null);
      setReason("");
      setNotice(
        failed.length
          ? `成功 ${succeeded.size} 条，失败 ${failed.length} 条：${failed
              .map((result) => result.notice)
              .filter(Boolean)
              .join("；")}`
          : `已完成 ${succeeded.size} 条审核。`
      );
    } catch {
      setNotice("网络异常，暂时无法提交批量审核。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {actionableIds.length ? (
        <div className="review-selection-bar">
          <button type="button" onClick={toggleAll}>
            {allSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
            {allSelected ? "取消全选" : "全选本页"}
          </button>
          <span>已选择 {selectedCount} 条</span>
        </div>
      ) : null}

      <div className="review-queue-list">
        {items.map((item) => {
          const isTopic = Number(item.floor) === 0;
          const author =
            item._u_name || item.uinfo?.name || `用户 ${item.uid}`;
          return (
            <article className="review-queue-card" key={item.id}>
              <header>
                {Number(item.review || 0) !== 0 ? (
                  <button
                    type="button"
                    className="review-select-button"
                    aria-label={selected.has(item.id) ? "取消选择" : "选择"}
                    onClick={() => toggleItem(item.id)}
                  >
                    {selected.has(item.id) ? (
                      <CheckSquare2 size={19} />
                    ) : (
                      <Square size={19} />
                    )}
                  </button>
                ) : null}
                <span className="review-content-kind">
                  {isTopic ? <FileText size={13} /> : <MessageCircle size={13} />}
                  {isTopic ? "帖子" : `${item.floor} 楼回复`}
                </span>
                <Link
                  href={`/topic/${item.topic_id}${
                    isTopic ? "" : `#floor-${item.floor}`
                  }`}
                  prefetch={false}
                >
                  {item.topic?.title || `主题 ${item.topic_id}`}
                </Link>
              </header>
              <div className="review-queue-author">
                <Link href={`/user/${item.uid}`}>
                  <Avatar
                    src={item._u_avatar}
                    name={author}
                    size="sm"
                  />
                  <strong data-member-uid={item.uid}>{author}</strong>
                </Link>
                <time>{relativeTime(item.mtime || item.ctime)}</time>
              </div>
              <div
                className="rich-content review-queue-content"
                data-math-content={
                  isHu60MarkdownContent(item.safeContent)
                    ? "markdown"
                    : undefined
                }
                dangerouslySetInnerHTML={{ __html: item.safeContent }}
              />
              <ReviewActions
                contentId={item.id}
                reviewState={item.review}
                logs={item.review_log}
                context={context}
                onReviewed={removeReviewed}
              />
            </article>
          );
        })}
      </div>

      {!items.length ? (
        <div className="review-queue-empty">
          <Check size={24} />
          <strong>当前队列已经处理完成</strong>
          <span>没有符合筛选条件的内容。</span>
        </div>
      ) : null}

      {selectedCount ? (
        <div className="review-batch-bar">
          {!decision ? (
            <>
              <span>已选择 {selectedCount} 条</span>
              <button
                type="button"
                className="batch-pass"
                onClick={() => setDecision("pass")}
              >
                <Check size={15} />
                批量通过
              </button>
              <button
                type="button"
                className="batch-reject"
                onClick={() => setDecision("reject")}
              >
                <XCircle size={15} />
                批量不通过
              </button>
            </>
          ) : (
            <form onSubmit={submitBatch}>
              <div>
                <strong>
                  {decision === "pass"
                    ? `批量通过 ${selectedCount} 条`
                    : `批量不通过 ${selectedCount} 条`}
                </strong>
                <button
                  type="button"
                  aria-label="取消批量审核"
                  onClick={() => {
                    setDecision(null);
                    setReason("");
                    setNotice("");
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required={decision === "reject"}
                maxLength={500}
                placeholder={
                  decision === "pass"
                    ? "通过理由（可不填）"
                    : "填写统一的不通过理由"
                }
              />
              <button
                type="submit"
                className={
                  decision === "pass" ? "confirm-pass" : "confirm-reject"
                }
                disabled={submitting}
              >
                {submitting ? "正在提交…" : "确认提交"}
              </button>
            </form>
          )}
        </div>
      ) : null}
      {notice ? <p className="review-batch-notice">{notice}</p> : null}
    </>
  );
}
