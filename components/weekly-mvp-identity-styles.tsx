import { getWeeklyMvpRanking } from "@/lib/weekly-report";

export async function WeeklyMvpIdentityStyles() {
  const ranking = await getWeeklyMvpRanking();
  if (ranking.__fallback) return null;

  const memberIds = Array.from(
    new Set(
      ranking.members
        .map((member) => Number(member.uid))
        .filter(
          (uid) => Number.isSafeInteger(uid) && uid > 0
        )
    )
  );

  if (!memberIds.length) return null;

  const selectors = memberIds
    .map((uid) => `[data-member-uid="${uid}"]`)
    .join(",");

  return (
    <style data-weekly-mvp-identities="active">
      {`${selectors}{color:var(--epic-purple)!important}`}
    </style>
  );
}
