"use client";

import { Bookmark, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=/topic/${topicId}`}>
        <Bookmark size={17} /> 登录后收藏
      </Link>
    );
  }

  async function toggleFavorite() {
    const nextFavorite = !isFavorite;
    setState("loading");

    try {
      const response = await fetch(`/api/topics/${topicId}/favorite`, {
        method: nextFavorite ? "POST" : "DELETE"
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
      }
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      className={isFavorite ? "saved" : undefined}
      disabled={state === "loading"}
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
    </button>
  );
}
