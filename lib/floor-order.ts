export const FLOOR_ORDER_COOKIE = "hulvlin_floor_reverse";

export function isFloorReverseEnabled(value: unknown) {
  return value === true || value === 1 || value === "1";
}

export function floorReverseFlag(floorReverse: boolean) {
  return floorReverse ? 1 : 0;
}

export function reverseSearchParam(floorReverse: boolean) {
  return floorReverse ? "1" : "0";
}

export function topicOrderQuery(
  floorReverse: boolean,
  extra?: Record<string, string>
) {
  return {
    ...extra,
    reverse: reverseSearchParam(floorReverse)
  };
}

export function appendReverseParam(
  params: URLSearchParams,
  floorReverse: boolean
) {
  params.set("reverse", reverseSearchParam(floorReverse));
}
