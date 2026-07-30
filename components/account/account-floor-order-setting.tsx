import { ArrowDownUp } from "lucide-react";

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
          <form action="/api/account/floor-order" method="post">
            <input type="hidden" name="floorReverse" value="0" />
            <button
              type="submit"
              className={floorReverse ? "" : "active"}
              aria-current={floorReverse ? undefined : "true"}
            >
              <ArrowDownUp size={14} />
              正序
            </button>
          </form>
          <form action="/api/account/floor-order" method="post">
            <input type="hidden" name="floorReverse" value="1" />
            <button
              type="submit"
              className={floorReverse ? "active" : ""}
              aria-current={floorReverse ? "true" : undefined}
            >
              <ArrowDownUp size={14} className="topic-floor-order-icon-reverse" />
              倒序
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
