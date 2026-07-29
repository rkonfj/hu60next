"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PageItem = number | "start-ellipsis" | "end-ellipsis";

function range(start: number, end: number) {
  return Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => start + index
  );
}

function pageItems(
  current: number,
  max: number,
  maxItems: number
): PageItem[] {
  if (max <= maxItems) return range(1, max);

  if (current <= maxItems - 2) {
    return [
      ...range(1, maxItems - 2),
      "end-ellipsis",
      max
    ];
  }

  if (current >= max - (maxItems - 3)) {
    return [
      1,
      "start-ellipsis",
      ...range(max - (maxItems - 3), max)
    ];
  }

  const windowSize = maxItems - 4;
  const windowStart = current - Math.floor((windowSize - 1) / 2);
  const windowEnd = windowStart + windowSize - 1;

  return [
    1,
    "start-ellipsis",
    ...range(windowStart, windowEnd),
    "end-ellipsis",
    max
  ];
}

function maxPageItemsForWidth(width: number, controlsWidth: number) {
  const pageItemWidth = 37;
  return Math.max(
    5,
    Math.floor((width - controlsWidth + 5) / pageItemWidth)
  );
}

export function Pagination({
  current,
  max,
  hasNext,
  path,
  query,
  className,
  previousPageTarget,
  nextPageTarget,
  prefetch
}: {
  current: number;
  max?: number;
  hasNext?: boolean;
  path: string;
  query?: Record<string, string>;
  className?: string;
  previousPageTarget?: string;
  nextPageTarget?: string;
  prefetch?: boolean;
}) {
  const knownMax = max && max >= 1 ? max : undefined;
  const canGoNext = knownMax ? current < knownMax : Boolean(hasNext);
  const compact = className?.split(/\s+/).includes("feed-pagination-top");
  const navRef = useRef<HTMLElement>(null);
  const [maxPageItems, setMaxPageItems] = useState(5);

  useEffect(() => {
    if (!knownMax || compact || !navRef.current) return;

    const nav = navRef.current;
    const compactControlsQuery = window.matchMedia("(max-width: 700px)");
    const update = (width: number) => {
      const firstControl = nav.firstElementChild;
      const lastControl = nav.lastElementChild;
      const columnGap =
        Number.parseFloat(window.getComputedStyle(nav).columnGap) || 0;
      const controlsWidth =
        (firstControl?.getBoundingClientRect().width || 0) +
        (lastControl?.getBoundingClientRect().width || 0) +
        columnGap * 2;
      setMaxPageItems(maxPageItemsForWidth(width, controlsWidth));
    };
    const updateFromCurrentWidth = () => {
      update(nav.getBoundingClientRect().width);
    };
    const observer = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width);
    });

    updateFromCurrentWidth();
    observer.observe(nav);
    compactControlsQuery.addEventListener("change", updateFromCurrentWidth);
    return () => {
      observer.disconnect();
      compactControlsQuery.removeEventListener(
        "change",
        updateFromCurrentWidth
      );
    };
  }, [compact, knownMax]);

  if (current <= 1 && !canGoNext) return null;

  const hrefFor = (page: number, target?: string) => {
    const params = new URLSearchParams({ ...query, page: String(page) });
    const hash = target ? `#${encodeURIComponent(target)}` : "";
    return `${path}?${params.toString()}${hash}`;
  };

  return (
    <nav
      ref={navRef}
      className={["pagination", className].filter(Boolean).join(" ")}
      aria-label="分页"
    >
      {current > 1 ? (
        <Link
          href={hrefFor(current - 1, previousPageTarget)}
          prefetch={prefetch}
          aria-label="上一页"
        >
          <ChevronLeft size={16} />
          <span className="pagination-label">上一页</span>
        </Link>
      ) : (
        <span className="disabled" aria-label="上一页" aria-disabled="true">
          <ChevronLeft size={16} />
          <span className="pagination-label">上一页</span>
        </span>
      )}
      {knownMax && !compact ? (
        <div className="pagination-pages">
          {pageItems(current, knownMax, maxPageItems).map((item) => {
            if (typeof item === "number") {
              return item === current ? (
                <span
                  key={item}
                  className="current"
                  aria-current="page"
                  aria-label={`第 ${item} 页，当前页`}
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={hrefFor(
                    item,
                    item < current ? previousPageTarget : nextPageTarget
                  )}
                  prefetch={prefetch}
                  aria-label={`第 ${item} 页`}
                >
                  {item}
                </Link>
              );
            }

            const direction = item === "start-ellipsis" ? -1 : 1;
            const jumpSize = Math.max(3, maxPageItems - 3);
            const target = Math.max(
              1,
              Math.min(knownMax, current + direction * jumpSize)
            );

            return (
              <Link
                key={item}
                href={hrefFor(
                  target,
                  direction < 0 ? previousPageTarget : nextPageTarget
                )}
                prefetch={prefetch}
                className="pagination-ellipsis"
                aria-label={`${direction < 0 ? "向前" : "向后"}跳至第 ${target} 页`}
              >
                …
              </Link>
            );
          })}
        </div>
      ) : (
        <strong>
          {knownMax ? `${current} / ${knownMax}` : `第 ${current} 页`}
        </strong>
      )}
      {canGoNext ? (
        <Link
          href={hrefFor(current + 1, nextPageTarget)}
          prefetch={prefetch}
          aria-label="下一页"
        >
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
