import { redirect } from "next/navigation";
import { isExploreTab } from "@/components/explore-feed";

type HomeProps = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const tab = isExploreTab(query.tab) ? query.tab : "latest";
  const page = Math.max(1, Number(query.page) || 1);
  const pageQuery = page > 1 ? `?page=${page}` : "";

  redirect(`/explore/${tab}${pageQuery}`);
}
