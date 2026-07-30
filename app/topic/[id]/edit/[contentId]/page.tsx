import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditPostForm } from "@/components/compose/edit-post-form";
import { topicOrderQuery } from "@/lib/floor-order";
import { resolveFloorReverse } from "@/lib/floor-order.server";
import { getAccountProfile, getEditPostForm, getFaces } from "@/lib/hu60";
import { topicFloorHref, topicHref } from "@/lib/topic-navigation";

export const metadata: Metadata = { title: "修改帖子" };

type EditPostPageProps = {
  params: Promise<{ id: string; contentId: string }>;
  searchParams: Promise<{ page?: string; reverse?: string }>;
};

export default async function EditPostPage({
  params,
  searchParams
}: EditPostPageProps) {
  const [{ id, contentId }, query] = await Promise.all([
    params,
    searchParams
  ]);
  const topicId = Number(id);
  const postContentId = Number(contentId);
  const page = Math.max(1, Number(query.page) || 1);

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const account = sid ? await getAccountProfile(sid) : null;
  const floorReverse = await resolveFloorReverse({
    reverse: query.reverse,
    accountFloorReverse: account?.floorReverse
  });

  if (
    !Number.isInteger(topicId) ||
    topicId < 1 ||
    !Number.isInteger(postContentId) ||
    postContentId < 1
  ) {
    notFound();
  }

  const orderQuery = topicOrderQuery(floorReverse);
  const editQuery = new URLSearchParams({ reverse: orderQuery.reverse });
  if (page > 1) editQuery.set("page", String(page));
  const nextPath = `/topic/${topicId}/edit/${postContentId}?${editQuery.toString()}`;

  if (!sid) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const [form, faces] = await Promise.all([
    getEditPostForm(topicId, postContentId, page, sid),
    getFaces()
  ]);
  const floor = Number(form.floorMeta?.floor ?? 0);
  const returnPath =
    floor > 0
      ? topicFloorHref(topicId, floor, floorReverse)
      : topicHref(topicId, { page, floorReverse });
  const formReady =
    form.isLogin === true &&
    typeof form.token === "string" &&
    typeof form.content === "string" &&
    form.success !== false;

  return (
    <main className="page-shell narrow-page compose-page edit-post-page">
      <header className="page-heading edit-page-heading">
        <span className="eyebrow">
          <PenLine size={14} />
          {form.editTitle ? "修改主题" : `修改第 ${floor} 楼`}
        </span>
        <h1>{form.tMeta?.title || "修改帖子内容"}</h1>
        <p>保存后将直接更新当前帖子。</p>
      </header>
      {formReady ? (
        <EditPostForm
          topicId={topicId}
          contentId={postContentId}
          page={page}
          floor={floor}
          floorReverse={floorReverse}
          initialTitle={form.title || form.tMeta?.title || ""}
          initialContent={form.content || ""}
          editTitle={form.editTitle === true}
          needReason={form.needReason === true}
          faces={faces}
        />
      ) : (
        <div className="empty-state edit-post-error">
          <PenLine size={28} />
          <h1>暂时不能修改这个楼层</h1>
          <p>
            {form.notice ||
              (form.isLogin === false
                ? "登录状态已失效，请重新登录。"
                : "你可能没有修改权限，或者楼层已被锁定。")}
          </p>
          <Link href={returnPath} prefetch={false}>
            返回帖子
          </Link>
        </div>
      )}
    </main>
  );
}
