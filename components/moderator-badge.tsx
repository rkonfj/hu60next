import { ShieldCheck } from "lucide-react";

export function ModeratorBadge({
  isModerator
}: {
  isModerator?: boolean;
}) {
  if (!isModerator) return null;

  return (
    <span className="moderator-badge" title="拥有帖子审核权限">
      <ShieldCheck size={13} strokeWidth={2.2} aria-hidden="true" />
      MOD
    </span>
  );
}

