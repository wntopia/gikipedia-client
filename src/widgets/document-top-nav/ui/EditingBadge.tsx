"use client";

import { useArticleEditors } from "../model/use-article-editors";

/**
 * 문서 상단의 '○○ 편집 중' 표시. 편집자는 브라우저에서 주기적으로 읽는다 — 서버에서 읽으면 문서를 열 때마다 백엔드를
 * 한 번 더 기다리고, 열어 둔 동안 바뀌는 것도 보이지 않는다.
 *
 * 아무도 편집하지 않거나, 아직 모르거나, 읽지 못하면 그리지 않는다. 여러 명이면 첫 이름과 나머지 사람 수로 줄인다.
 */
export function EditingBadge({ articleId }: { articleId: number }) {
  const editors = useArticleEditors(articleId);
  if (!editors?.editing || editors.editorCount < 1) return null;

  const others = editors.editorCount - 1;
  const firstName = editors.editorNames[0]?.trim() || "누군가";

  return (
    <div
      title={editors.editorNames.join(", ")}
      className="flex flex-shrink-0 items-center gap-2 rounded-[20px] bg-success/12 py-1.5 pl-2.5 pr-[13px] text-[12.5px] text-success-fg"
    >
      <span className="h-[7px] w-[7px] animate-[livepulse_2s_infinite] rounded-full bg-success" />
      {/* 휴대폰 폭에서는 누가 편집하는지 빼고 '편집 중'만 보인다. 이름은 title로 남는다. */}
      <span className="hidden sm:inline">
        <b className="text-success-strong">{firstName}</b>
        {others > 0 ? ` 외 ${others}명` : ""}
      </span>
      편집 중
    </div>
  );
}
