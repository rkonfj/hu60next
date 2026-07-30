"use client";

import { ArrowDownUp } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  appendReverseParam,
  FLOOR_ORDER_COOKIE
} from "@/lib/floor-order";

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
  appendReverseParam(params, floorReverse);
  if (floor && floor > 0) params.set("floor", String(floor));
  else if (page > 1) params.set("page", String(page));

  return `/topic/${topicId}?${params.toString()}#replies`;
}

export function TopicFloorOrder({
  topicId,
  floorReverse,
  page,
  floor
}: TopicFloorOrderProps) {
  const router = useRouter();

  function selectOrder(nextReverse: boolean) {
    rememberFloorOrder(nextReverse);
    router.push(topicOrderHref(topicId, nextReverse, page, floor));
    router.refresh();
  }

  return (
    <div
      className="feed-tabs topic-floor-order"
      role="group"
      aria-label="楼层排序"
    >
      <button
        type="button"
        className={floorReverse ? "" : "active"}
        aria-current={floorReverse ? undefined : "true"}
        onClick={() => selectOrder(false)}
      >
        <ArrowDownUp size={14} />
        正序
      </button>
      <button
        type="button"
        className={floorReverse ? "active" : ""}
        aria-current={floorReverse ? "true" : undefined}
        onClick={() => selectOrder(true)}
      >
        <ArrowDownUp size={14} className="topic-floor-order-icon-reverse" />
        倒序
      </button>
    </div>
  );
}
