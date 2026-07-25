import { cookies } from "next/headers";
import { MobileNavClient } from "@/components/mobile-nav-client";

export async function MobileNav() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("hulvlin_sid")?.value);

  return <MobileNavClient isLoggedIn={isLoggedIn} />;
}
