import { notFound } from "next/navigation";
import {
  ExploreFeed,
  isExploreTab
} from "@/components/explore-feed";

type ExplorePageProps = {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ExplorePage({
  params,
  searchParams
}: ExplorePageProps) {
  const [{ tab }, query] = await Promise.all([params, searchParams]);

  if (!isExploreTab(tab)) {
    notFound();
  }

  const page = Math.max(1, Number(query.page) || 1);
  return <ExploreFeed activeTab={tab} page={page} />;
}
