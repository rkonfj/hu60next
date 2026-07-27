import { ShieldCheck } from "lucide-react";

export function ModeratorBadge({
  isModerator
}: {
  isModerator?: boolean;
}) {
  if (!isModerator) return null;

  return (
    <span
      className="moderator-badge"
      title="拥有帖子审核权限"
      aria-label="MOD"
    >
      <ShieldCheck size={15} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}
