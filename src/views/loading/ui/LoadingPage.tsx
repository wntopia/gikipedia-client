import { Skeleton } from "@/shared/ui";

/** 문단 자리 — 줄 길이를 조금씩 달리해 글처럼 보이게 한다. */
const LINE_WIDTHS = ["w-full", "w-[94%]", "w-[97%]", "w-[88%]", "w-3/5"];

/**
 * 화면을 불러오는 동안 보이는 자리표시. 루트에 하나만 두고 모든 화면이 함께 쓴다.
 *
 * 화면마다 상단 바가 달라(로고와 검색 / 뒤로 가기 / 편집 동작) 어느 한 바를 흉내 내면 다른 화면에서
 * 엉뚱한 바가 잠깐 보인다. 그래서 바는 높이와 양 끝 자리만 잡고, 본문은 제목과 문단 모양으로 둔다.
 */
export function LoadingPage() {
  return (
    <div role="status" className="min-h-screen bg-bg text-fg">
      <span className="sr-only">불러오는 중…</span>

      <div className="mx-auto flex h-[58px] max-w-[1000px] items-center justify-between px-4 sm:px-8">
        <Skeleton className="h-5 w-[104px]" />
        <Skeleton round className="h-[34px] w-[34px]" />
      </div>

      <div className="mx-auto max-w-[1000px] px-4 pb-[120px] pt-8 sm:px-8 sm:pt-[52px]">
        <Skeleton className="h-9 w-[38%]" />
        <Skeleton className="mt-[14px] h-3 w-[22%]" />

        <div className="mt-[46px] flex flex-col gap-3.5">
          {LINE_WIDTHS.map((width) => (
            <Skeleton key={width} className={`h-3.5 ${width}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
