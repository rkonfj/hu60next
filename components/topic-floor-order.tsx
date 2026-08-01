"use client";

import { ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { reverseSearchParam } from "@/lib/floor-order";

type TopicFloorOrderProps = {
  topicId: number;
  floorReverse: boolean;
};

function topicOrderHref(topicId: number, floorReverse: boolean) {
  const params = new URLSearchParams({
    reverse: reverseSearchParam(floorReverse)
  });
  return `/topic/${topicId}?${params.toString()}#replies`;
}

export function TopicFloorOrder({
  topicId,
  floorReverse
}: TopicFloorOrderProps) {
  const ascendingHref = topicOrderHref(topicId, false);
  const descendingHref = topicOrderHref(topicId, true);

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
        prefetch={false}
        scroll={false}
      >
        <ArrowDownUp size={14} />
        正序
      </Link>
      <Link
        href={descendingHref}
        className={floorReverse ? "active" : ""}
        aria-current={floorReverse ? "true" : undefined}
        prefetch={false}
        scroll={false}
      >
        <ArrowDownUp size={14} className="topic-floor-order-icon-reverse" />
        倒序
      </Link>
    </div>
  );
}
