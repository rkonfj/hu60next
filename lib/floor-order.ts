export function isFloorReverseEnabled(value: unknown) {
  return value === true || value === 1 || value === "1";
}

export function parseReverseOverride(reverse?: string) {
  if (reverse === "1") return true;
  if (reverse === "0") return false;
  return undefined;
}

export function topicFetchOptions(options?: {
  reverse?: string;
  floor?: number | string;
}) {
  const reverseOverride = parseReverseOverride(options?.reverse);
  const targetFloor = Number(options?.floor);

  return {
    ...(reverseOverride !== undefined ? { floorReverse: reverseOverride } : {}),
    ...(Number.isInteger(targetFloor) && targetFloor > 0
      ? { floor: targetFloor }
      : {})
  };
}

export function floorReverseFlag(floorReverse: boolean) {
  return floorReverse ? 1 : 0;
}

export function reverseSearchParam(floorReverse: boolean) {
  return floorReverse ? "1" : "0";
}

export function topicOrderQuery(
  reverseOverride?: boolean,
  extra?: Record<string, string>
) {
  if (reverseOverride === undefined) {
    return extra ?? {};
  }

  return {
    ...extra,
    reverse: reverseSearchParam(reverseOverride)
  };
}

export function appendReverseParam(
  params: URLSearchParams,
  floorReverse?: boolean
) {
  if (floorReverse === undefined) return;
  params.set("reverse", reverseSearchParam(floorReverse));
}
