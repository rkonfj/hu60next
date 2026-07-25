import {
  Blocks,
  Bot,
  ChevronRight,
  Laptop,
  Megaphone,
  MonitorSmartphone,
  PanelsTopLeft,
  Smartphone
} from "lucide-react";
import Link from "next/link";
import type { Forum } from "@/lib/types";

const icons = [Laptop, PanelsTopLeft, Bot, Smartphone, Blocks, Megaphone];

export function LeftRail({ forums }: { forums: Forum[] }) {
  return (
    <aside className="left-rail">
      <div className="rail-title">
        <span>社区版块</span>
        <Link href="/forums">全部</Link>
      </div>
      <nav className="forum-nav" aria-label="社区版块">
        {forums.slice(0, 8).map((forum, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Link href={`/forum/${forum.id}`} key={forum.id}>
              <span className={`forum-icon forum-icon-${(index % 5) + 1}`}>
                <Icon size={17} />
              </span>
              <span>
                <strong>{forum.name}</strong>
                <small>{forum.newTopic?.length ?? 0} 条新讨论</small>
              </span>
              <ChevronRight size={15} />
            </Link>
          );
        })}
      </nav>
      <div className="rail-note">
        <span className="live-dot" />
        <div>
          <strong>连接真实社区</strong>
          <p>内容实时来自 hu60 JSON Page</p>
        </div>
      </div>
    </aside>
  );
}
