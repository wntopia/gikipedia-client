import type { ReactNode, Ref } from "react";
import { MAX_SUMMARY_LENGTH } from "@/features/save-article";
import { EditorPreview } from "./EditorPreview";

const TEXTAREA_PLACEHOLDER =
  "== 문단 제목 ==\n본문 내용을 입력하세요. [[존재하는 문서]]는 자동으로 링크됩니다.";

/** 편집 역사에 남는 편집 요약과 가벼운 수정 여부 */
type RevisionNote = {
  summary: string;
  minorEdit: boolean;
  onSummaryChange: (summary: string) => void;
  onMinorEditChange: (minorEdit: boolean) => void;
};

type DocumentEditorProps = {
  title: string;
  /** 없으면 제목을 고칠 수 없다. 기존 문서는 백엔드가 제목 수정을 받지 않는다. */
  onTitleChange?: (title: string) => void;
  /** 위키 문법으로 된 본문 */
  content: string;
  /** `cursor`는 입력 직후의 커서 위치. 공동편집이 어디를 고쳤는지 가르는 데 쓴다 */
  onContentChange: (content: string, cursor: number) => void;
  /** 본문의 한글 조합(IME) 시작·끝. 공동편집이 조합 중에 다른 사람의 변경을 미루는 데 쓴다 */
  onContentCompositionStart?: () => void;
  onContentCompositionEnd?: (content: string, cursor: number) => void;
  /**
   * 주면 `locked` 대신 이 값으로 본문 잠금을 정한다. 공동편집은 저장 중에도 본문을 고칠 수 있고(남들도 계속 고친다),
   * 대신 지금 편집 상태를 받기 전에는 고칠 수 없다.
   */
  contentReadOnly?: boolean;
  showPreview: boolean;
  /** 편집 요약 입력. 기존 문서를 고칠 때만 준다 — 문서 생성 요청에는 이 필드가 없다. */
  revisionNote?: RevisionNote;
  /** 저장하는 동안 입력을 잠근다. 요청을 보낸 뒤에 고친 글자는 저장되지 않기 때문이다. */
  locked: boolean;
  /** 저장이 막혔을 때 고칠 칸으로 포커스를 옮기기 위한 ref. 공동편집은 본문 칸을 직접 고치려고도 쓴다 */
  titleRef?: Ref<HTMLInputElement>;
  contentRef?: Ref<HTMLTextAreaElement>;
  /**
   * 본문 칸 위에 겹쳐 그릴 것(공동편집의 다른 사람 커서). textarea와 같은 자리에 두고 미리보기에서는 textarea와 함께 뺀다.
   * 입력을 가로막지 않도록 포인터 이벤트를 받지 않아야 한다.
   */
  contentOverlay?: ReactNode;
  /** 본문 칸 옆에 둘 것(대표 이미지 · 도움말). 제목은 화면 폭 전체를 쓰고, 이것은 제목 아래 본문 줄에서 시작한다. */
  aside?: ReactNode;
};

/** 제목·본문 편집기와 편집 요약 입력 */
export function DocumentEditor({
  title,
  onTitleChange,
  content,
  onContentChange,
  onContentCompositionStart,
  onContentCompositionEnd,
  contentReadOnly,
  showPreview,
  revisionNote,
  locked,
  titleRef,
  contentRef,
  contentOverlay,
  aside,
}: DocumentEditorProps) {
  return (
    <div>
      <input
        ref={titleRef}
        aria-label="문서 제목"
        value={title}
        onChange={(event) => onTitleChange?.(event.target.value)}
        readOnly={!onTitleChange || locked}
        title={
          onTitleChange ? undefined : "만든 뒤에는 제목을 바꿀 수 없습니다"
        }
        // 새 문서는 제목 없이 열릴 수 있어, 빈 줄만 보이지 않게 자리를 알려 준다.
        placeholder="문서 제목"
        className="mb-[18px] w-full border-b border-divider bg-transparent pb-[14px] text-[24px] font-extrabold sm:text-[30px] tracking-[-.02em] text-fg outline-none placeholder:text-faint read-only:cursor-default"
      />

      {/* 좁은 화면에서는 대표 이미지 · 도움말을 본문 아래로 내린다. */}
      <div className="flex flex-col gap-7 lg:flex-row">
        <div className="min-w-0 flex-1">
          {showPreview ? (
            <EditorPreview content={content} />
          ) : (
            <div className="relative">
              <textarea
                ref={contentRef}
                aria-label="본문"
                value={content}
                onChange={(event) =>
                  onContentChange(event.target.value, event.target.selectionEnd)
                }
                onCompositionStart={onContentCompositionStart}
                onCompositionEnd={(event) =>
                  onContentCompositionEnd?.(
                    event.currentTarget.value,
                    event.currentTarget.selectionEnd,
                  )
                }
                readOnly={contentReadOnly ?? locked}
                placeholder={TEXTAREA_PLACEHOLDER}
                className="h-[60vh] min-h-[320px] w-full resize-y sm:h-[480px] rounded-xl bg-sunken p-[22px] elevate-inset font-mono text-sm leading-[1.9] text-fg-muted outline-none placeholder:text-faint"
              />
              {contentOverlay}
            </div>
          )}

          {revisionNote && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <input
                aria-label="편집 요약"
                value={revisionNote.summary}
                onChange={(event) =>
                  revisionNote.onSummaryChange(event.target.value)
                }
                readOnly={locked}
                maxLength={MAX_SUMMARY_LENGTH}
                placeholder="편집 요약 (예: 연혁 문단에 2026년 내용 추가)"
                className="min-w-0 flex-1 basis-[220px] rounded-[9px] bg-surface elevate-control px-[14px] py-2.5 text-[13.5px] text-fg outline-none"
              />
              <label className="flex flex-shrink-0 items-center gap-[7px] text-[13px] text-fg-soft">
                <input
                  type="checkbox"
                  checked={revisionNote.minorEdit}
                  onChange={(event) =>
                    revisionNote.onMinorEditChange(event.target.checked)
                  }
                  disabled={locked}
                  className="h-[15px] w-[15px] accent-accent"
                />
                가벼운 수정
              </label>
            </div>
          )}
        </div>
        {aside && (
          <aside className="w-full lg:w-[260px] lg:flex-shrink-0">{aside}</aside>
        )}
      </div>
    </div>
  );
}
