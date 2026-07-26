import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserProfileView } from "@/components/user-profile-view";
import { getUserProfile } from "@/lib/hu60";

type UserTabPageProps = {
  params: Promise<{ id: string; tab: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params
}: UserTabPageProps): Promise<Metadata> {
  const { id, tab } = await params;
  const uid = Number(id);

  if (tab !== "replies" || !Number.isInteger(uid) || uid <= 0) {
    return { title: "用户主页" };
  }

  const profile = await getUserProfile(uid);
  if (profile.__fallback) return { title: "用户回复" };

  return { title: `${profile.name || `用户 ${uid}`}的回复` };
}

export default async function UserTabPage({
  params,
  searchParams
}: UserTabPageProps) {
  const [{ id, tab }, query] = await Promise.all([params, searchParams]);
  const uid = Number(id);

  if (
    tab !== "replies" ||
    !Number.isInteger(uid) ||
    uid <= 0
  ) {
    notFound();
  }

  return (
    <UserProfileView
      uid={uid}
      page={Math.max(1, Number(query.page) || 1)}
      activeTab="replies"
    />
  );
}
