import { MessageCircle, Trees } from "lucide-react";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/explore/latest" className="brand" aria-label="虎绿林首页">
      <span className="brand-mark" aria-hidden="true">
        <Trees size={20} strokeWidth={2.2} />
        <MessageCircle size={12} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>虎绿林</strong>
          <small>HULVLIN</small>
        </span>
      )}
    </Link>
  );
}
