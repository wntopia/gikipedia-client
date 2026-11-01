import { SearchForm } from "@/features/search";

/** 홈 상단 히어로 — 제목과 검색 진입점을 가운데에 둔다 */
export function HomeHero() {
  return (
    <section className="mx-auto flex max-w-[1120px] flex-col items-center px-4 pb-10 pt-12 sm:px-8 sm:pb-12 sm:pt-[72px] text-center">
      <div className="mb-[14px] font-mono text-xs uppercase tracking-[.12em] text-accent">
        교내 전용 위키
      </div>
      <h1 className="mb-7 break-keep text-[28px] font-extrabold sm:text-[38px] leading-[1.25] tracking-[-.02em]">
        학생·교사가 함께 쓰는 기록
      </h1>

      <div className="w-full max-w-[620px] text-left">
        <SearchForm
          variant="hero"
          placeholder="문서, 동아리, 인물, 행사를 검색해보세요"
        />
      </div>
    </section>
  );
}
