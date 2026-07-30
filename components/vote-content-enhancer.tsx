"use client";

import {
  CheckCircle2,
  LoaderCircle,
  TriangleAlert,
  Vote
} from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

type VoteOption = {
  id: string;
  label: string;
  count: number | null;
};

type VotePoll = {
  topicId: number;
  question: string;
  multiple: boolean;
  closed: boolean;
  closesAt: number | null;
  resultsVisible: boolean;
  totalVoters: number | null;
  options: VoteOption[];
  selectedOptionIds: string[];
};

type VoteResponse = {
  success?: boolean;
  notice?: string;
  isLogin?: boolean;
  poll?: VotePoll;
};

function formatDeadline(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(timestamp * 1000));
}

function VoteCard({ topicId }: { topicId: number }) {
  const [poll, setPoll] = useState<VotePoll | null>(null);
  const [isLogin, setIsLogin] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadPoll(signal?: AbortSignal) {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`/api/votes/${topicId}`, {
        cache: "no-store",
        signal
      });
      const data = (await response.json()) as VoteResponse;
      if (!response.ok || !data.success || !data.poll) {
        setNotice(data.notice || "投票载入失败。");
        return;
      }
      setPoll(data.poll);
      setIsLogin(data.isLogin === true);
      setSelected(data.poll.selectedOptionIds);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("投票载入失败，请稍后刷新重试。");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadPoll(controller.signal);
    return () => controller.abort();
  }, [topicId]);

  useEffect(() => {
    if (!poll?.closesAt || poll.closed) return;
    let timer = 0;
    const schedule = () => {
      const remaining = poll.closesAt! * 1000 - Date.now();
      timer = window.setTimeout(
        () => {
          if (remaining <= 24 * 60 * 60 * 1000) {
            void loadPoll();
          } else {
            schedule();
          }
        },
        Math.max(250, Math.min(remaining, 24 * 60 * 60 * 1000))
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [poll?.closesAt, poll?.closed]);

  function toggleOption(optionId: string) {
    if (!poll || poll.closed || poll.selectedOptionIds.length) return;
    setSelected((current) =>
      poll.multiple
        ? current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        : [optionId]
    );
  }

  async function submitVote() {
    if (!poll || !selected.length || submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`/api/votes/${topicId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionIds: selected })
      });
      const data = (await response.json()) as VoteResponse;
      if (!response.ok || !data.success || !data.poll) {
        setNotice(data.notice || "投票提交失败。");
        if (response.status === 409) await loadPoll();
        return;
      }
      setPoll(data.poll);
      setSelected(data.poll.selectedOptionIds);
      setIsLogin(true);
      setNotice("投票已提交。");
    } catch {
      setNotice("投票提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="vote-card vote-card-loading" aria-live="polite">
        <LoaderCircle className="spin" size={18} />
        正在载入投票…
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="vote-card vote-card-error" role="alert">
        <TriangleAlert size={18} />
        <span>{notice || "这个投票不存在。"}</span>
      </div>
    );
  }

  const hasVoted = poll.selectedOptionIds.length > 0;
  const disabled = hasVoted || poll.closed || submitting;
  const loginNext =
    typeof window === "undefined"
      ? `/topic/${topicId}`
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  return (
    <section className="vote-card" aria-labelledby={`vote-${topicId}-title`}>
      <header className="vote-card-header">
        <span className="vote-card-icon" aria-hidden="true">
          <Vote size={18} />
        </span>
        <div>
          <h3 id={`vote-${topicId}-title`}>{poll.question}</h3>
          <p>
            {poll.multiple ? "多选投票" : "单选投票"}
            {" · "}
            {poll.resultsVisible
              ? `${poll.totalVoters ?? 0} 人参与`
              : "结果截止后公布"}
            {poll.closesAt
              ? ` · ${poll.closed ? "已截止" : "截止"} ${formatDeadline(poll.closesAt)}`
              : poll.closed
                ? " · 已结束"
                : ""}
          </p>
        </div>
      </header>
      <div className="vote-options">
        {poll.options.map((option) => {
          const checked = selected.includes(option.id);
          const chosen = poll.selectedOptionIds.includes(option.id);
          const optionCount = option.count ?? 0;
          const percentage = poll.totalVoters
            ? Math.min(
                100,
                Math.round((optionCount / poll.totalVoters) * 100)
              )
            : 0;

          return (
            <label
              className={`vote-option${chosen ? " is-chosen" : ""}`}
              key={option.id}
            >
              <span className="vote-option-control">
                <input
                  type={poll.multiple ? "checkbox" : "radio"}
                  name={`vote-${topicId}`}
                  value={option.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleOption(option.id)}
                />
                <span>{option.label}</span>
                {chosen ? (
                  <CheckCircle2
                    className="vote-chosen-icon"
                    size={15}
                    aria-label="你的选择"
                  />
                ) : null}
              </span>
              {poll.resultsVisible ? (
                <span className="vote-option-result">
                  <span
                    className="vote-option-bar"
                    style={{ width: `${percentage}%` }}
                  />
                  <span>
                    {optionCount} 票 · {percentage}%
                  </span>
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      <footer className="vote-card-footer">
        {!isLogin ? (
          <a href={`/login?next=${encodeURIComponent(loginNext)}`}>
            登录后参与投票
          </a>
        ) : hasVoted ? (
          <span className="vote-complete">
            <CheckCircle2 size={15} /> 你已参与
            {!poll.resultsVisible ? " · 结果将在截止后公布" : ""}
          </span>
        ) : poll.closed ? (
          <span>投票已结束</span>
        ) : (
          <button
            type="button"
            disabled={!selected.length || submitting}
            onClick={submitVote}
          >
            {submitting ? (
              <>
                <LoaderCircle className="spin" size={15} /> 正在提交
              </>
            ) : (
              "提交投票"
            )}
          </button>
        )}
        {notice ? (
          <span
            className={notice === "投票已提交。" ? "success" : "error"}
            role="status"
          >
            {notice}
          </span>
        ) : null}
      </footer>
    </section>
  );
}

const voteSelector = ".hu60-vote[data-vote-topic-id]";

function voteRootsWithin(node: ParentNode) {
  const roots = Array.from(
    node.querySelectorAll<HTMLElement>(voteSelector)
  );
  if (node instanceof HTMLElement && node.matches(voteSelector)) {
    roots.unshift(node);
  }
  return roots;
}

export function VoteContentEnhancer() {
  useEffect(() => {
    const mounted = new Map<HTMLElement, Root>();

    const mountWithin = (node: ParentNode) => {
      for (const element of voteRootsWithin(node)) {
        if (mounted.has(element)) continue;
        const topicId = Number(element.dataset.voteTopicId);
        if (!Number.isSafeInteger(topicId) || topicId < 1) continue;

        const root = createRoot(element);
        mounted.set(element, root);
        root.render(<VoteCard topicId={topicId} />);
      }
    };

    const unmountWithin = (node: Node) => {
      for (const [element, root] of mounted) {
        if (node === element || (node instanceof Element && node.contains(element))) {
          root.unmount();
          mounted.delete(element);
        }
      }
    };

    mountWithin(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) unmountWithin(node);
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) mountWithin(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const root of mounted.values()) root.unmount();
      mounted.clear();
    };
  }, []);

  return null;
}
