"use client";

import { Ban, LoaderCircle, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function UserRelationshipActions({
  uid,
  isLoggedIn,
  isSelf,
  initialFollow,
  initialBlock
}: {
  uid: number;
  isLoggedIn: boolean;
  isSelf: boolean;
  initialFollow: boolean;
  initialBlock: boolean;
}) {
  const [following, setFollowing] = useState(initialFollow);
  const [blocked, setBlocked] = useState(initialBlock);
  const [busy, setBusy] = useState<"follow" | "block" | null>(null);
  const [notice, setNotice] = useState("");

  if (isSelf) {
    return (
      <div className="user-relationship-actions">
        <Link href="/settings">编辑我的资料</Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="user-relationship-actions">
        <Link href={`/login?next=/user/${uid}`}>登录后关注</Link>
      </div>
    );
  }

  async function update(kind: "follow" | "block") {
    const active = kind === "follow" ? following : blocked;
    const action =
      kind === "follow"
        ? active
          ? "unfollow"
          : "follow"
        : active
          ? "unblock"
          : "block";

    if (
      action === "block" &&
      !window.confirm("屏蔽后双方将不能互发私信，确定继续吗？")
    ) {
      return;
    }

    setBusy(kind);
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
      if (kind === "follow") setFollowing(!active);
      else setBlocked(!active);
      setNotice(result.notice || "操作成功。");
    } catch {
      setNotice("暂时无法连接用户关系服务。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="user-relationship-wrap">
      <div className="user-relationship-actions">
        <button
          type="button"
          className={following ? "active" : undefined}
          disabled={busy !== null}
          onClick={() => update("follow")}
        >
          {busy === "follow" ? (
            <LoaderCircle className="spin" size={15} />
          ) : following ? (
            <UserCheck size={15} />
          ) : (
            <UserPlus size={15} />
          )}
          {following ? "已关注" : "关注"}
        </button>
        <button
          type="button"
          className={blocked ? "danger active" : "danger"}
          disabled={busy !== null}
          onClick={() => update("block")}
        >
          {busy === "block" ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Ban size={15} />
          )}
          {blocked ? "取消屏蔽" : "屏蔽"}
        </button>
      </div>
      {notice ? <span className="user-relationship-notice">{notice}</span> : null}
    </div>
  );
}
