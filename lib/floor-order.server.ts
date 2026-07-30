import { cookies } from "next/headers";
import {
  FLOOR_ORDER_COOKIE,
  isFloorReverseEnabled
} from "@/lib/floor-order";

export async function resolveFloorReverse(options?: {
  reverse?: string;
  accountFloorReverse?: boolean;
}) {
  if (options?.reverse === "1") return true;
  if (options?.reverse === "0") return false;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(FLOOR_ORDER_COOKIE)?.value;
  if (cookieValue === "1") return true;
  if (cookieValue === "0") return false;

  return isFloorReverseEnabled(options?.accountFloorReverse);
}
