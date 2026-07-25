"use client";

import { Bookmark, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function FavoriteButton({
  topicId,
  isLoggedIn
}: {
  topicId: number;
  isLoggedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "saved" | "error">(
    "idle"
  );

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=/topic/${topicId}`}>
        <Bookmark size={17} /> 登录后收藏
      </Link>
    );
  }

  async function saveFavorite() {
    setState("loading");

    try {
      const response = await fetch(`/api/topics/${topicId}/favorite`, {
        method: "POST"
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };

      setState(response.ok && result.success ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      className={state === "saved" ? "saved" : undefined}
      disabled={state === "loading" || state === "saved"}
      onClick={saveFavorite}
    >
      {state === "loading" ? (
        <LoaderCircle className="spin" size={17} />
      ) : (
        <Bookmark size={17} />
      )}
      {state === "loading"
        ? "收藏中"
        : state === "saved"
          ? "已收藏"
          : state === "error"
            ? "收藏失败，重试"
            : "收藏"}
    </button>
  );
}
