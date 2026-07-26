import { cookies } from "next/headers";
import { MobileNavClient } from "@/components/mobile-nav-client";
import { getUserStatus } from "@/lib/hu60";

export async function MobileNav() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const session = await getUserStatus(sid);
  const isLoggedIn = Boolean(sid || session.uid || session.isLogin === true);
  const canReview =
    session.isLogin === true &&
    session.permissions?.includes("PERMISSION_REVIEW_POST") === true;

  return (
    <MobileNavClient isLoggedIn={isLoggedIn} canReview={canReview} />
  );
}
