import { ArrowUpRight, Radio, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { TopicCard } from "@/components/topic-card";
import type { Topic } from "@/lib/types";

export function RightRail({ topics }: { topics: Topic[] }) {
  const trending = [...topics]
    .sort(
      (a, b) =>
        b.reply_count * 10 +
        b.read_count / 100 -
        (a.reply_count * 10 + a.read_count / 100)
    )
    .slice(0, 4);

  return (
    <aside className="right-rail">
      <section className="rail-card trending-card">
        <div className="rail-card-title">
          <span>
            <Sparkles size={17} />
            正在热议
          </span>
          <small>此刻</small>
        </div>
        <div className="trending-list">
          {trending.map((topic, index) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              compact
              rank={index + 1}
            />
          ))}
        </div>
      </section>
      <section className="rail-card community-card">
        <div className="community-illustration" aria-hidden="true">
          <span className="orb orb-one" />
          <span className="orb orb-two" />
          <Radio size={30} />
        </div>
        <strong>保持好奇，也保持友善</strong>
        <p>分享真实经验，尊重不同观点，让每次讨论都留下有用的答案。</p>
        <Link href="/forums">
          浏览社区公约 <ArrowUpRight size={14} />
        </Link>
      </section>
      <div className="safe-note">
        <ShieldCheck size={16} />
        <span>用户内容经过安全过滤后展示</span>
      </div>
    </aside>
  );
}
