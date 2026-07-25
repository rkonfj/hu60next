import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function Pagination({
  current,
  max,
  path,
  query
}: {
  current: number;
  max: number;
  path: string;
  query?: Record<string, string>;
}) {
  if (max <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams({ ...query, page: String(page) });
    return `${path}?${params.toString()}`;
  };

  return (
    <nav className="pagination" aria-label="分页">
      {current > 1 ? (
        <Link href={hrefFor(current - 1)}>
          <ChevronLeft size={16} /> 上一页
        </Link>
      ) : (
        <span className="disabled">
          <ChevronLeft size={16} /> 上一页
        </span>
      )}
      <strong>
        {current} / {max}
      </strong>
      {current < max ? (
        <Link href={hrefFor(current + 1)}>
          下一页 <ChevronRight size={16} />
        </Link>
      ) : (
        <span className="disabled">
          下一页 <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
