"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RelationshipAction = "follow" | "unfollow" | "block" | "unblock";

const actionLabels: Record<RelationshipAction, string> = {
  follow: "也关注 Ta",
  unfollow: "取消关注",
  block: "也屏蔽 Ta",
  unblock: "取消屏蔽"
};

export function RelationshipListAction({
  uid,
  initialAction,
  label
}: {
  uid: number;
  initialAction: RelationshipAction;
  label?: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState(initialAction);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function update() {
    if (
      action === "block" &&
      !window.confirm("屏蔽后双方将不能互发私信，确定继续吗？")
    ) {
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const form = new FormData();
      form.set("action", action);
      const response = await fetch(`/api/users/${uid}/relationship`, {
        method: "POST",
        body: form
      });
      const result = (await response.json()) as {
        success?: boolean;
        notice?: string;
      };
      if (!response.ok || !result.success) {
        setNotice(result.notice || "操作失败。");
        return;
      }
      setAction(
        action === "follow"
          ? "unfollow"
          : action === "unfollow"
            ? "follow"
            : action === "block"
              ? "unblock"
              : "block"
      );
      setNotice(result.notice || "操作成功。");
      router.refresh();
    } catch {
      setNotice("暂时无法连接关系服务。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relationship-row-action">
      <button
        type="button"
        className={action === "block" || action === "unblock" ? "danger" : ""}
        disabled={busy}
        onClick={update}
      >
        {busy ? <LoaderCircle className="spin" size={14} /> : null}
        {action === initialAction && label ? label : actionLabels[action]}
      </button>
      {notice ? <small>{notice}</small> : null}
    </div>
  );
}
