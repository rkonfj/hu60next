"use client";

import { Check, History, ShieldCheck, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ReviewLogTimeline } from "@/components/reviews/review-log-timeline";
import type { ReviewLogEntry } from "@/lib/types";
import type { ReviewQueueFilter } from "@/lib/hu60";

export type ReviewActionContext =
  | {
      type: "queue";
      page: number;
      filter: ReviewQueueFilter;
    }
  | {
      type: "topic";
      topicId: number;
      page: number;
    };

type ReviewDecision = "pass" | "reject";

export function ReviewActions({
  contentId,
  reviewState,
  logs,
  context,
  onReviewed
}: {
  contentId: number;
  reviewState?: number;
  logs?: ReviewLogEntry[];
  context: ReviewActionContext;
  onReviewed?: (contentId: number) => void;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLogs, setShowLogs] = useState(
    () => Number(reviewState) === 1
  );
  const canReview = Number(reviewState || 0) !== 0;
  const isPendingReview = Number(reviewState) === 1;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || (decision === "reject" && !reason.trim())) {
      setNotice("审核不通过时必须填写理由。");
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
          items: [
            {
              contentId,
              decision,
              reason: reason.trim()
            }
          ]
        })
      });
      const data = (await response.json()) as {
        notice?: string;
        results?: Array<{ success: boolean; notice?: string }>;
      };
      const result = data.results?.[0];

      if (!response.ok || !result?.success) {
        setNotice(result?.notice || data.notice || "审核提交失败。");
        return;
      }

      setDecision(null);
      setReason("");
      setNotice("审核已提交。");
      onReviewed?.(contentId);
      router.refresh();
    } catch {
      setNotice("网络异常，暂时无法提交审核。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`review-actions-shell${
        isPendingReview ? " is-pending" : ""
      }`}
    >
      <div className="review-actions-row">
        {canReview ? (
          <>
            <button
              type="button"
              className="review-pass-button"
              onClick={() => {
                setShowLogs(false);
                setDecision("pass");
                setNotice("");
              }}
            >
              <Check size={14} />
              通过
            </button>
            <button
              type="button"
              className="review-reject-button"
              onClick={() => {
                setShowLogs(false);
                setDecision("reject");
                setNotice("");
              }}
            >
              <XCircle size={14} />
              不通过
            </button>
          </>
        ) : (
          <span className="review-complete-label">
            <ShieldCheck size={14} />
            已处理
          </span>
        )}
        <button
          type="button"
          className="review-log-trigger"
          aria-expanded={showLogs}
          onClick={() => {
            const open = !showLogs;
            setShowLogs(open);
            if (open) {
              setDecision(null);
              setReason("");
              setNotice("");
            }
          }}
        >
          <History size={14} />
          审核记录
          <span>{Array.isArray(logs) ? logs.length : 0}</span>
        </button>
      </div>

      {showLogs ? (
        <ReviewLogTimeline logs={logs} onClose={() => setShowLogs(false)} />
      ) : null}

      {decision ? (
        <form className="review-reason-form" onSubmit={submit}>
          <div>
            <strong>
              {decision === "pass" ? "确认审核通过" : "确认审核不通过"}
            </strong>
            <button
              type="button"
              aria-label="取消审核"
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
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            required={decision === "reject"}
            placeholder={
              decision === "pass"
                ? "通过理由（可不填）"
                : "填写审核不通过理由"
            }
          />
          <button
            type="submit"
            className={decision === "pass" ? "confirm-pass" : "confirm-reject"}
            disabled={submitting}
          >
            {submitting
              ? "正在提交…"
              : decision === "pass"
                ? "确认通过"
                : "确认不通过"}
          </button>
        </form>
      ) : null}
      {notice ? <p className="review-action-notice">{notice}</p> : null}
    </div>
  );
}
