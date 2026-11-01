import type { IsoDateTime } from "@/shared/api";
import { formatDate } from "@/shared/lib";

type RevisionStatsProps = {
  revisionCount: number;
  /** 고유 편집자 수. `partial`이면 리비전 일부만 세어 실제로는 더 많을 수 있다. */
  contributors: { count: number; partial: boolean };
  createdAt: IsoDateTime | null;
};

/** 편집 역사 상단의 리비전 통계 카드 3종 */
export function RevisionStats({
  revisionCount,
  contributors,
  createdAt,
}: RevisionStatsProps) {
  const stats = [
    {
      label: "전체 리비전",
      value: revisionCount.toLocaleString("ko-KR"),
      tone: "text-accent",
    },
    {
      label: "기여자",
      value: `${contributors.count.toLocaleString("ko-KR")}${contributors.partial ? "+" : ""}`,
      tone: "text-success",
    },
    {
      label: "최초 생성",
      value: createdAt ? formatDate(createdAt) : "—",
      tone: "text-fg",
    },
  ];

  return (
    <div className="flex gap-2 sm:gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-3 elevate-1 sm:px-4 sm:py-[14px]"
        >
          <div className={`font-mono text-xl font-bold ${stat.tone}`}>
            {stat.value}
          </div>
          <div className="mt-0.5 break-keep text-xs text-fg-subtle">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
