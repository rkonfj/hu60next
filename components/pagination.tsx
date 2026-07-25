import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function Pagination({
  current,
  max,
  hasNext,
  path,
  query,
  className
}: {
  current: number;
  max?: number;
  hasNext?: boolean;
  path: string;
  query?: Record<string, string>;
  className?: string;
}) {
  const knownMax = max && max >= 1 ? max : undefined;
  const canGoNext = knownMax ? current < knownMax : Boolean(hasNext);

  if (current <= 1 && !canGoNext) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams({ ...query, page: String(page) });
    return `${path}?${params.toString()}`;
  };

  return (
    <nav
      className={["pagination", className].filter(Boolean).join(" ")}
      aria-label="分页"
    >
      {current > 1 ? (
        <Link href={hrefFor(current - 1)} aria-label="上一页">
          <ChevronLeft size={16} />
          <span className="pagination-label">上一页</span>
        </Link>
      ) : (
        <span className="disabled" aria-label="上一页" aria-disabled="true">
          <ChevronLeft size={16} />
          <span className="pagination-label">上一页</span>
        </span>
      )}
      <strong>
        {knownMax ? `${current} / ${knownMax}` : `第 ${current} 页`}
      </strong>
      {canGoNext ? (
        <Link href={hrefFor(current + 1)} aria-label="下一页">
          <span className="pagination-label">下一页</span>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className="disabled" aria-label="下一页" aria-disabled="true">
          <span className="pagination-label">下一页</span>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
