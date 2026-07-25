"use client";

import { Bookmark, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useState } from "react";

export function FavoriteButton({
  topicId,
  isLoggedIn,
  initialFavorite = false
}: {
  topicId: number;
  isLoggedIn: boolean;
  initialFavorite?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [notice, setNotice] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=/topic/${topicId}`}>
        <Bookmark size={17} /> 登录后收藏
      </Link>
    );
  }

  const action = isFavorite ? "unset" : "set";
  const favoriteUrl = `/api/topics/${topicId}/favorite?action=${action}&next=/topic/${topicId}`;

  async function toggleFavorite(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (state === "loading") return;

    const nextFavorite = !isFavorite;
    setState("loading");
    setNotice(null);

    try {
      const response = await fetch(favoriteUrl, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" }
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };

      if (response.ok && result.success) {
        setIsFavorite(nextFavorite);
        setState("idle");
      } else {
        setState("error");
        setNotice(
          result.notice ||
            (nextFavorite ? "收藏失败，请稍后再试。" : "取消收藏失败，请稍后再试。")
        );
      }
    } catch {
      setState("error");
      setNotice("网络请求失败，请稍后重试。");
    }
  }

  return (
    <>
      <a
        href={favoriteUrl}
        className={isFavorite ? "saved" : undefined}
        aria-disabled={state === "loading"}
        onClick={toggleFavorite}
      >
        {state === "loading" ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Bookmark fill={isFavorite ? "currentColor" : "none"} size={17} />
        )}
        {state === "loading"
          ? isFavorite
            ? "取消中"
            : "收藏中"
          : state === "error"
            ? isFavorite
              ? "取消失败，重试"
              : "收藏失败，重试"
            : isFavorite
              ? "取消收藏"
              : "加入收藏"}
      </a>
      {notice ? (
        <span className="favorite-notice" role="status">
          {notice}
        </span>
      ) : null}
    </>
  );
}
