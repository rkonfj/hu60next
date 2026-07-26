import { Bot, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import {
  ReviewQueue,
  type ReviewQueueDisplayItem
} from "@/components/reviews/review-queue";
import {
  getReviewQueue,
  getUserStatus,
  type ReviewQueueFilter
} from "@/lib/hu60";
import { sanitizeHu60ReviewContent } from "@/lib/sanitize";

export const metadata: Metadata = { title: "审核中心" };
export const dynamic = "force-dynamic";

type ReviewPageProps = {
  searchParams: Promise<{
    page?: string;
    tab?: string;
    bots?: string;
  }>;
};

function reviewFilter(value?: string): ReviewQueueFilter {
  if (value === "mine" || value === "rejected") return value;
  return "pending";
}

export default async function ReviewsPage({
  searchParams
}: ReviewPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const filter = reviewFilter(params.tab);
  const showBot = params.bots === "1";
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!sid) redirect("/login?next=/reviews");

  const session = await getUserStatus(sid);
  if (
    session.isLogin !== true ||
    !session.permissions?.includes("PERMISSION_REVIEW_POST")
  ) {
    notFound();
  }

  const queue = await getReviewQueue(page, sid, filter, showBot);
  const items: ReviewQueueDisplayItem[] = queue.replyList.map((item) => ({
    ...item,
    safeContent: sanitizeHu60ReviewContent(
      item.content,
      Number(item.review || 0) !== 0
    )
  }));
  const tabs: Array<{ key: ReviewQueueFilter; label: string }> = [
    { key: "pending", label: "待审核" },
    { key: "mine", label: "我审核的" },
    { key: "rejected", label: "未通过" }
  ];

  return (
    <main className="page-shell narrow-page content-page reviews-page">
      <header className="reviews-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={14} />
            内容管理
          </span>
          <h1>审核中心</h1>
          <p>审核帖子与回复，所有决定都会写入完整审核记录。</p>
        </div>
        <strong>{queue.replyCount || 0} 条</strong>
      </header>

      <nav className="review-tabs" aria-label="审核筛选">
        {tabs.map((tab) => (
          <Link
            href={`/reviews?tab=${tab.key}${showBot ? "&bots=1" : ""}`}
            className={filter === tab.key ? "active" : undefined}
            aria-current={filter === tab.key ? "page" : undefined}
            key={tab.key}
          >
            {tab.label}
          </Link>
        ))}
        <Link
          className={`review-bot-toggle${showBot ? " active" : ""}`}
          href={`/reviews?tab=${filter}${showBot ? "" : "&bots=1"}`}
        >
          <Bot size={14} />
          {showBot ? "隐藏机器人" : "显示机器人"}
        </Link>
      </nav>

      {queue.__fallback ? (
        <div className="data-notice">
          暂时无法读取审核队列，请稍后刷新重试。
        </div>
      ) : (
        <ReviewQueue
          key={`${filter}:${page}:${showBot ? 1 : 0}`}
          initialItems={items}
          page={page}
          filter={filter}
          showBot={showBot}
        />
      )}

      {!queue.__fallback ? (
        <Pagination
          current={queue.currPage}
          max={queue.maxPage}
          path="/reviews"
          query={{
            tab: filter,
            ...(showBot ? { bots: "1" } : {})
          }}
        />
      ) : null}
    </main>
  );
}
