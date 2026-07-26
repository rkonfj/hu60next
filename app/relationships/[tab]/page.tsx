import {
  Ban,
  CircleOff,
  LockKeyhole,
  UserCheck,
  Users
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Pagination } from "@/components/pagination";
import { RelationshipListAction } from "@/components/relationship-list-action";
import { getRelationships, getUserStatus } from "@/lib/hu60";
import type {
  RelationshipResponse,
  RelationshipType
} from "@/lib/types";

type RelationshipPageProps = {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ page?: string }>;
};

const tabMeta: Record<
  RelationshipType,
  { label: string; title: string; empty: string; icon: typeof Users }
> = {
  follow: {
    label: "我的关注",
    title: "我关注的",
    empty: "还没有关注其他用户。",
    icon: UserCheck
  },
  follow_me: {
    label: "关注我的",
    title: "关注我的",
    empty: "暂时还没有用户关注你。",
    icon: Users
  },
  block: {
    label: "我的屏蔽",
    title: "我屏蔽的",
    empty: "没有屏蔽任何用户。",
    icon: Ban
  },
  block_me: {
    label: "屏蔽我的",
    title: "屏蔽我的",
    empty: "当前列表为空。",
    icon: CircleOff
  }
};

function isRelationshipType(value: string): value is RelationshipType {
  return value in tabMeta;
}

function rowAction(
  tab: RelationshipType,
  uid: number,
  data: RelationshipResponse
) {
  const inverse = Boolean(data.inverseRelationship?.[String(uid)]);
  if (tab === "follow") {
    return <RelationshipListAction uid={uid} initialAction="unfollow" />;
  }
  if (tab === "block") {
    return <RelationshipListAction uid={uid} initialAction="unblock" />;
  }
  if (tab === "follow_me") {
    return (
      <RelationshipListAction
        uid={uid}
        initialAction={inverse ? "unfollow" : "follow"}
        label={inverse ? "已互相关注" : undefined}
      />
    );
  }
  return (
    <RelationshipListAction
      uid={uid}
      initialAction={inverse ? "unblock" : "block"}
      label={inverse ? "已互相屏蔽" : undefined}
    />
  );
}

export async function generateMetadata({
  params
}: RelationshipPageProps): Promise<Metadata> {
  const { tab } = await params;
  return {
    title: isRelationshipType(tab) ? tabMeta[tab].title : "关系管理"
  };
}

export default async function RelationshipTabPage({
  params,
  searchParams
}: RelationshipPageProps) {
  const [{ tab }, query] = await Promise.all([params, searchParams]);
  if (!isRelationshipType(tab)) notFound();

  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;
  const status = await getUserStatus(sid);

  if (!status.uid || status.isLogin !== true) {
    return (
      <main className="page-shell narrow-page content-page">
        <div className="empty-state locked-state">
          <LockKeyhole size={30} />
          <h1>登录后查看关系列表</h1>
          <p>关注和屏蔽关系只会对当前账号显示。</p>
          <Link href={`/login?next=/relationships/${tab}`}>前往登录</Link>
        </div>
      </main>
    );
  }

  const page = Math.max(1, Number(query.page) || 1);
  const data = await getRelationships(tab, page, sid);
  const current = tabMeta[tab];
  const CurrentIcon = current.icon;

  return (
    <main className="page-shell narrow-page content-page relationship-page">
      <header className="list-page-heading">
        <div>
          <span className="eyebrow">
            <CurrentIcon size={14} />
            关系管理
          </span>
          <h1>{current.title}</h1>
        </div>
        <span>本页 {data.userList.length} 位</span>
      </header>

      <nav className="relationship-tabs" aria-label="关系分类">
        {(Object.keys(tabMeta) as RelationshipType[]).map((key) => {
          const item = tabMeta[key];
          const Icon = item.icon;
          return (
            <Link
              href={`/relationships/${key}`}
              className={key === tab ? "active" : undefined}
              aria-current={key === tab ? "page" : undefined}
              key={key}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {data.__fallback ? (
        <div className="data-notice">暂时无法读取关系列表，请稍后刷新。</div>
      ) : null}

      <section className="relationship-list">
        {data.userList.map((user) => (
          <article className="relationship-row" key={user.uid}>
            <Link className="relationship-user" href={`/user/${user.uid}`}>
              <Avatar src={user.avatar} name={user.name} size="md" />
              <span>
                <strong data-member-uid={user.uid}>
                  {user.name || `用户 ${user.uid}`}
                </strong>
                <small>UID {user.uid}</small>
              </span>
            </Link>
            {rowAction(tab, user.uid, data)}
          </article>
        ))}
      </section>

      {!data.userList.length && !data.__fallback ? (
        <div className="empty-state">
          <CurrentIcon size={28} />
          <h2>暂无用户</h2>
          <p>{current.empty}</p>
        </div>
      ) : null}

      <Pagination
        current={data.currPage}
        max={data.maxPage}
        path={`/relationships/${tab}`}
      />
    </main>
  );
}
