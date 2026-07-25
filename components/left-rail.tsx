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
          <strong>hu60 社区</strong>
          <p>持续更新的技术讨论</p>
        </div>
      </div>
    </aside>
  );
}
