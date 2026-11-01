import Link from "next/link";
import type { ReactNode } from "react";

/** 미리보기·취소가 같은 모양이라 공유한다 */
const SECONDARY_BUTTON =
  "flex-shrink-0 cursor-pointer rounded-lg bg-surface-2 elevate-control px-3 py-2 text-[13px] font-semibold text-fg-muted hover:text-fg-muted sm:px-[14px]";

type EditorTopBarProps = {
  /**
   * 편집을 그만두면 돌아갈 곳. 뒤로 가기 링크와 취소 버튼이 함께 쓴다.
   * 새 문서는 돌아갈 문서가 없어 문서 주소를 여기서 만들지 않고 화면에서 받는다.
   */
  backHref: string;
  /** 뒤로 가기 링크에 표시되는 이름. 기존 문서를 편집할 때는 그 문서의 제목이다. */
  backLabel: string;
  showPreview: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  /** 저장 요청이 오가는 동안과 저장 뒤 문서로 넘어가는 동안 저장 버튼을 막는다 */
  saving: boolean;
  /** 저장할 수 없는 동안의 이유. 주면 저장 버튼을 막고 이유를 버튼의 설명으로 보인다 */
  saveBlockedReason?: string;
  /** '편집 중' 표시 옆에 둘 상태 (공동편집 연결 상태 등) */
  status?: ReactNode;
  /** 오른쪽 버튼들 앞에 둘 것 (함께 편집 중인 사람들) */
  participants?: ReactNode;
  /**
   * 뒤로 가기·취소 링크로 떠나기 직전에 불린다. `preventDefault()`를 부르면 머문다.
   * 저장하지 않은 내용이 있을 때 확인을 받는 데 쓴다 (`<Link>`의 `onNavigate`).
   */
  onLeave: (event: { preventDefault: () => void }) => void;
};

/** 편집 화면 상단 바. 다른 화면과 달리 로고 대신 문서 복귀 링크와 편집 액션을 둔다. */
export function EditorTopBar({
  backHref,
  backLabel,
  showPreview,
  onTogglePreview,
  onSave,
  saving,
  saveBlockedReason,
  status,
  participants,
  onLeave,
}: EditorTopBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-bg/[.92] elevate-header backdrop-blur-[10px]">
      <div className="mx-auto flex h-[58px] max-w-[1120px] items-center gap-2.5 px-4 sm:gap-4 sm:px-8">
        {/* 돌아갈 곳이 문서 화면이면 미리 가져오기가 문서를 조회해 조회수를 올린다 (CLAUDE.md '백엔드 연동과 인증') */}
        <Link
          href={backHref}
          prefetch={false}
          onNavigate={onLeave}
          className="flex min-w-0 items-center gap-[7px] text-[13.5px] text-fg-soft hover:text-fg-soft"
        >
          <span className="text-[15px]">←</span>
          {/* 좁은 화면에서는 저장 버튼까지 한 줄에 두려고 화살표만 남긴다. 이름은 화면 낭독기에 남긴다. */}
          <span className="truncate max-md:sr-only">{backLabel}</span>
        </Link>
        <span className="flex-shrink-0 rounded-[5px] bg-accent/[.12] px-[9px] py-[3px] font-mono text-[11px] text-accent-hover max-sm:hidden">
          편집 중
        </span>
        {status}

        <div className="flex-1" />
        {participants}

        <button type="button" onClick={onTogglePreview} className={SECONDARY_BUTTON}>
          {showPreview ? (
            <>
              <span className="sm:hidden">편집기</span>
              <span className="max-sm:hidden">편집기로 돌아가기</span>
            </>
          ) : (
            "미리보기"
          )}
        </button>
        <Link
          href={backHref}
          prefetch={false}
          onNavigate={onLeave}
          // 휴대폰 폭에서는 같은 곳으로 가는 왼쪽 화살표가 대신한다.
          className={`${SECONDARY_BUTTON} max-sm:hidden`}
        >
          취소
        </Link>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saveBlockedReason !== undefined}
          title={saveBlockedReason}
          className="flex-shrink-0 cursor-pointer rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-on-accent elevate-control transition hover:bg-accent-hover disabled:cursor-default disabled:opacity-60 disabled:hover:bg-accent"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </header>
  );
}
