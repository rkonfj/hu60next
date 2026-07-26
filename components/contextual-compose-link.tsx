"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ContextualComposeLink() {
  const pathname = usePathname();
  const forumId = pathname.match(/^\/forum\/(\d+)(?:\/|$)/)?.[1];
  const href = forumId ? `/compose?forum=${forumId}` : "/compose";

  return (
    <Link href={href} className="compose-button">
      <PenLine size={17} />
      <span>发布</span>
    </Link>
  );
}
