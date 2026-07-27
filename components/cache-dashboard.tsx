"use client";

import {
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  XCircle
} from "lucide-react";
import { useState } from "react";
import type {
  CacheDashboardData,
  CacheRefreshHistory,
  CacheStatus
} from "@/lib/cache-types";

function displayTime(value: number | null) {
  if (!value) return "尚未更新";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function cacheStateLabel(cache: CacheStatus) {
  if (cache.state === "building") return "更新中";
  if (cache.state === "fresh") return "有效";
  if (cache.state === "expired") return "已过期";
  return "未建立";
}

function historyDuration(history: CacheRefreshHistory) {
  return Math.max(0, history.finishedAt - history.startedAt);
}

export function CacheDashboard({
  initialData
}: {
  initialData: CacheDashboardData;
}) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [personalUid, setPersonalUid] = useState("");

  const refresh = async (
    cache: Pick<CacheStatus, "key" | "label">,
    targetUid?: number
  ) => {
    const refreshKey = targetUid
      ? `${cache.key}:${targetUid}`
      : cache.key;
    setRefreshing(refreshKey);
    setNotice("");
    try {
      const response = await fetch("/api/cache/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: cache.key,
          ...(targetUid ? { uid: targetUid } : {})
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        dashboard?: CacheDashboardData;
        refresh?: CacheRefreshHistory;
      };
      if (payload.dashboard) setData(payload.dashboard);
      if (!response.ok) throw new Error(payload.error || "刷新失败");
      setNotice(
        payload.refresh?.ok
          ? `${cache.label}刷新成功`
          : payload.refresh?.message || "刷新失败"
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <>
      {notice ? <div className="cache-notice">{notice}</div> : null}

      <form
        className="cache-personal-refresh"
        onSubmit={(event) => {
          event.preventDefault();
          const uid = Number(personalUid);
          if (!Number.isInteger(uid) || uid <= 0) {
            setNotice("请输入有效的UID");
            return;
          }
          void refresh(
            { key: "personal-weekly-report", label: `个人足迹 #${uid}` },
            uid
          );
        }}
      >
        <div>
          <strong>刷新指定用户的个人足迹</strong>
          <span>输入UID后读取用户名并重新生成15分钟缓存。</span>
        </div>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={personalUid}
          onChange={(event) => setPersonalUid(event.target.value)}
          placeholder="用户 UID"
          aria-label="用户 UID"
        />
        <button type="submit" disabled={refreshing !== null}>
          <RefreshCw
            size={15}
            className={
              refreshing?.startsWith("personal-weekly-report:")
                ? "is-spinning"
                : undefined
            }
          />
          立即刷新
        </button>
      </form>

      <section className="cache-list" aria-label="缓存列表">
        {data.caches.map((cache) => {
          const refreshKey = cache.targetUid
            ? `personal-weekly-report:${cache.targetUid}`
            : cache.key;
          const isRefreshing = refreshing === refreshKey;
          return (
            <article className="cache-card" key={cache.key}>
              <div className="cache-card-icon" aria-hidden="true">
                <Database size={18} />
              </div>
              <div className="cache-card-copy">
                <div>
                  <h2>{cache.label}</h2>
                  <span className={`cache-state ${cache.state}`}>
                    {cacheStateLabel(cache)}
                  </span>
                </div>
                <p>{cache.description}</p>
                <dl>
                  <div>
                    <dt>最后更新</dt>
                    <dd>{displayTime(cache.lastUpdatedAt)}</dd>
                  </div>
                  <div>
                    <dt>有效期至</dt>
                    <dd>{displayTime(cache.expiresAt)}</dd>
                  </div>
                  <div>
                    <dt>缓存数量</dt>
                    <dd>{cache.entryCount ?? "—"}</dd>
                  </div>
                </dl>
              </div>
              <button
                type="button"
                onClick={() =>
                  refresh(
                    {
                      key: cache.targetUid
                        ? "personal-weekly-report"
                        : cache.key,
                      label: cache.label
                    },
                    cache.targetUid
                  )
                }
                disabled={
                  refreshing !== null ||
                  cache.state === "building"
                }
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? "is-spinning" : undefined}
                />
                {isRefreshing ? "刷新中" : "立即刷新"}
              </button>
            </article>
          );
        })}
      </section>

      <section className="cache-history">
        <header>
          <div>
            <span className="eyebrow">
              <Clock3 size={14} />
              刷新日志
            </span>
            <h2>上游请求历史</h2>
          </div>
          <small>仅保留当前实例最近30次操作</small>
        </header>

        {data.history.length ? (
          <div className="cache-history-list">
            {data.history.map((history) => (
              <article key={history.id}>
                <header>
                  <span>
                    {history.ok ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    <strong>{history.cacheLabel}</strong>
                  </span>
                  <small>
                    {displayTime(history.startedAt)} · MOD #{history.actorUid} ·{" "}
                    {historyDuration(history)}ms
                  </small>
                </header>
                <p>{history.message}</p>
                {history.requests.length ? (
                  <ol>
                    {history.requests.map((request, index) => (
                      <li key={`${history.id}:${index}`}>
                        <span>{request.method}</span>
                        <code>{request.url}</code>
                        <small className={request.ok ? "ok" : "failed"}>
                          {request.status ?? "ERR"} · {request.durationMs}ms
                        </small>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="cache-history-empty">
                    本次刷新复用了已有数据，没有访问上游接口。
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state cache-empty-state">
            <Database size={24} />
            <p>还没有手动刷新记录。</p>
          </div>
        )}
      </section>
    </>
  );
}
