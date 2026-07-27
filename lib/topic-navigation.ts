export const TOPIC_PAGE_SIZE = 30;

export function topicPageForFloor(floor: number) {
  return Math.floor(Math.max(0, Math.trunc(floor)) / TOPIC_PAGE_SIZE) + 1;
}

export function topicFloorHref(topicId: number, floor: number) {
  const safeFloor = Math.max(0, Math.trunc(floor));
  if (safeFloor < 1) return `/topic/${topicId}`;

  const page = topicPageForFloor(safeFloor);
  const query = page > 1 ? `?page=${page}` : "";
  return `/topic/${topicId}${query}#floor-${safeFloor}`;
}
