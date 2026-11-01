import Link from "next/link";
import { ROUTES } from "@/shared/config";

type HistoryTopBarProps = {
  /** 역사를 보고 있는 문서. 뒤로 가기 링크가 이 문서로 돌아간다. */
  articleId: number;
  /** 역사를 보고 있는 문서 제목. 뒤로 가기 링크에 표시된다. */
  documentTitle: string;
};

/** 편집 역사 화면 상단 바 — 문서 복귀 링크와 화면 제목만 둔다. */
export function HistoryTopBar({
  articleId,
  documentTitle,
}: HistoryTopBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-bg/85 elevate-header backdrop-blur-[10px]">
      <div className="mx-auto flex h-[58px] max-w-[1000px] items-center gap-4 px-4 sm:px-8">
        {/* 미리 가져오면 문서 조회가 일어나 조회수가 오른다. 과거 리비전만 보러 온 사람도 문서를 본 것으로 세게 된다. */}
        <Link
          href={ROUTES.document(articleId)}
          prefetch={false}
          className="flex min-w-0 items-center gap-[7px] text-[13.5px] text-fg-soft hover:text-fg-soft"
        >
          <span className="text-[15px]">←</span>
          <span className="truncate">{documentTitle}</span>
        </Link>
        <div className="flex-1" />
        <span className="flex-shrink-0 text-[13.5px] font-bold">편집 역사</span>
      </div>
    </header>
  );
}
