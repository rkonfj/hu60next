import { cookies } from "next/headers";
import { MobileNavClient } from "@/components/mobile-nav-client";
import { getUserStatus } from "@/lib/hu60";

export async function MobileNav() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const session = await getUserStatus(sid);
  const isLoggedIn = Boolean(session.uid || session.isLogin === true);

  return <MobileNavClient isLoggedIn={isLoggedIn} />;
}
