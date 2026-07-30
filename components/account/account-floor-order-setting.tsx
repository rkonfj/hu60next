import { ArrowDownUp } from "lucide-react";
import Link from "next/link";

export function AccountFloorOrderSetting({
  floorReverse
}: {
  floorReverse: boolean;
}) {
  return (
    <section className="settings-card">
      <header>
        <ArrowDownUp size={18} />
        <div>
          <h2>默认楼层排序</h2>
          <p>设置打开帖子时回复楼层的默认排序，与虎绿林账号偏好同步。</p>
        </div>
      </header>
      <div className="settings-floor-order">
        <div
          className="feed-tabs topic-floor-order"
          role="group"
          aria-label="默认楼层排序"
        >
          <Link
            href="/api/account/floor-order?floorReverse=0"
            className={floorReverse ? "" : "active"}
            aria-current={floorReverse ? undefined : "true"}
            prefetch={false}
          >
            <ArrowDownUp size={14} />
            正序
          </Link>
          <Link
            href="/api/account/floor-order?floorReverse=1"
            className={floorReverse ? "active" : ""}
            aria-current={floorReverse ? "true" : undefined}
            prefetch={false}
          >
            <ArrowDownUp size={14} className="topic-floor-order-icon-reverse" />
            倒序
          </Link>
        </div>
      </div>
    </section>
  );
}
