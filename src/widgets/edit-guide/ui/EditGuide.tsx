import { SidebarCard } from "@/shared/ui";

const CODE_CHIP =
  "rounded bg-surface-2 px-[5px] py-px font-mono text-fg";

/** 편집 화면 사이드바의 '편집 도움말' 카드. 스크롤을 따라 고정된다. */
export function EditGuide() {
  return (
    <div className="sticky top-20">
      <SidebarCard title="편집 도움말">
        <p className="mb-3 text-[13px] leading-[1.8] text-fg-soft">
          <span className={CODE_CHIP}>== 제목 ==</span> 으로 문단을 만듭니다.
        </p>
        <p className="mb-3 text-[13px] leading-[1.8] text-fg-soft">
          <span className={CODE_CHIP}>[[문서명]]</span> 으로 다른 문서를
          연결합니다.
        </p>
        <p className="mb-3 text-[13px] leading-[1.8] text-fg-soft">
          <span className={CODE_CHIP}>[[https://주소|글자]]</span> 로 바깥
          사이트를 연결합니다. 주소만 적어도 링크가 됩니다.
        </p>
        <p className="mb-3 text-[13px] leading-[1.8] text-fg-soft">
          <span className={CODE_CHIP}>&apos;&apos;&apos;글자&apos;&apos;&apos;</span>{" "}
          로 굵게 씁니다.
        </p>
        <p className="mb-3 text-[13px] leading-[1.8] text-fg-soft">
          <span className={CODE_CHIP}>* 항목</span> 으로 목록을 만듭니다.
        </p>

        <div className="my-[14px] h-px bg-divider" />

        <p className="text-[12.5px] leading-[1.7] text-fg-subtle">
          편집 내용은 저장 즉시 모두에게 공개되며, 부적절한 편집은 신고될 수
          있습니다.
        </p>
      </SidebarCard>
    </div>
  );
}
