import { isFloorReverseEnabled } from "@/lib/floor-order";

export async function resolveFloorReverse(options?: {
  reverse?: string;
  accountFloorReverse?: boolean;
}) {
  if (options?.reverse === "1") return true;
  if (options?.reverse === "0") return false;

  return isFloorReverseEnabled(options?.accountFloorReverse);
}
