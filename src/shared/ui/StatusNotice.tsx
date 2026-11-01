import type { ReactNode } from "react";

const MARK_TONE = {
  neutral: "border-dashed border-line-strong text-fg-subtle",
  danger: "border-danger text-danger",
} as const;

type StatusNoticeProps = {
  /** 제목 위 표식 칸에 들어갈 짧은 글자 (예: "404", "!") */
  mark: string;
  tone: keyof typeof MARK_TONE;
  /** 표식 아래의 모노스페이스 대문자 라벨 */
  label: string;
  title: string;
  description: ReactNode;
  /** 다음 행동으로 이어지는 링크·버튼 */
  actions?: ReactNode;
  /** 문의할 때 알려 줄 값처럼 본문보다 덜 중요한 정보 */
  footnote?: ReactNode;
};

/**
 * 화면 하나를 통째로 대신하는 안내(없는 페이지, 불러오기 실패).
 * 시안이 없어 '문서 없음' 화면의 안내와 같은 골격을 빌렸다. 가운데 정렬과 폭은 화면이 정한다.
 */
export function StatusNotice({
  mark,
  tone,
  label,
  title,
  description,
  actions,
  footnote,
}: StatusNoticeProps) {
  return (
    <section>
      <div
        className={`mx-auto mb-[26px] flex h-14 w-14 items-center justify-center rounded-[14px] border-[1.5px] font-mono text-lg ${MARK_TONE[tone]}`}
      >
        {mark}
      </div>

      <div className="mb-2.5 font-mono text-xs uppercase tracking-[.1em] text-fg-subtle">
        {label}
      </div>
      <h1 className="mb-[14px] break-keep text-[24px] font-extrabold sm:text-[28px]">{title}</h1>
      {/* 한국어 문장이 '보세/요'처럼 낱말 중간에서 끊기지 않게 한다. */}
      <p className="mx-auto mb-[30px] max-w-[480px] break-keep text-[15px] leading-[1.8] text-fg-soft">
        {description}
      </p>

      {actions && <div className="flex flex-wrap justify-center gap-2.5">{actions}</div>}
      {footnote && (
        <div className="mt-[26px] font-mono text-[11px] text-fg-subtle">
          {footnote}
        </div>
      )}
    </section>
  );
}
