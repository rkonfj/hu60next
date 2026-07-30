"use client";

import { ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { FLOOR_ORDER_COOKIE } from "@/lib/floor-order";

type TopicFloorOrderProps = {
  topicId: number;
  floorReverse: boolean;
  page: number;
  floor?: number;
};

function rememberFloorOrder(floorReverse: boolean) {
  const value = floorReverse ? "1" : "0";
  document.cookie = `${FLOOR_ORDER_COOKIE}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

function topicOrderHref(
  topicId: number,
  floorReverse: boolean,
  page: number,
  floor?: number
) {
  const params = new URLSearchParams();
  if (floorReverse) params.set("reverse", "1");
  if (floor && floor > 0) params.set("floor", String(floor));
  else if (page > 1) params.set("page", String(page));

  const query = params.size ? `?${params.toString()}` : "";
  return `/topic/${topicId}${query}#replies`;
}

export function TopicFloorOrder({
  topicId,
  floorReverse,
  page,
  floor
}: TopicFloorOrderProps) {
  const ascendingHref = topicOrderHref(topicId, false, page, floor);
  const descendingHref = topicOrderHref(topicId, true, page, floor);

  return (
    <div
      className="feed-tabs topic-floor-order"
      role="group"
      aria-label="楼层排序"
    >
      <Link
        href={ascendingHref}
        className={floorReverse ? "" : "active"}
        aria-current={floorReverse ? undefined : "true"}
        onClick={() => rememberFloorOrder(false)}
        prefetch={false}
      >
        <ArrowDownUp size={14} />
        正序
      </Link>
      <Link
        href={descendingHref}
        className={floorReverse ? "active" : ""}
        aria-current={floorReverse ? "true" : undefined}
        onClick={() => rememberFloorOrder(true)}
        prefetch={false}
      >
        <ArrowDownUp size={14} className="topic-floor-order-icon-reverse" />
        倒序
      </Link>
    </div>
  );
}
