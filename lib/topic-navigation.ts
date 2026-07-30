import { appendReverseParam } from "@/lib/floor-order";

export const TOPIC_PAGE_SIZE = 30;

export function topicPageForFloor(floor: number) {
  return Math.floor(Math.max(0, Math.trunc(floor)) / TOPIC_PAGE_SIZE) + 1;
}

export function topicFloorHref(
  topicId: number,
  floor: number,
  floorReverse = false
) {
  const safeFloor = Math.max(0, Math.trunc(floor));
  if (safeFloor < 1) return topicHref(topicId, { floorReverse });

  const params = new URLSearchParams({ floor: String(safeFloor) });
  appendReverseParam(params, floorReverse);
  return `/topic/${topicId}?${params.toString()}#floor-${safeFloor}`;
}

export function topicHref(
  topicId: number,
  options?: {
    page?: number;
    floorReverse?: boolean;
    floor?: number;
  }
) {
  const params = new URLSearchParams();
  const page = options?.page ?? 0;
  const floor = options?.floor ?? 0;

  if (floor > 0) params.set("floor", String(floor));
  else if (page > 1) params.set("page", String(page));
  appendReverseParam(params, options?.floorReverse === true);

  const query = `?${params.toString()}`;
  const hash = floor > 0 ? `#floor-${floor}` : "";
  return `/topic/${topicId}${query}${hash}`;
}
