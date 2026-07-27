import { ModeratorBadge } from "@/components/moderator-badge";
import { isModerator } from "@/lib/moderator";

export async function UserModeratorBadge({
  uid
}: {
  uid?: number | null;
}) {
  return <ModeratorBadge isModerator={await isModerator(uid)} />;
}

