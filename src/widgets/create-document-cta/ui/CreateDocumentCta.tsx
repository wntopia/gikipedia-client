import Link from "next/link";
import { ROUTES } from "@/shared/config";

type CreateDocumentCtaProps = {
  query: string;
};

/** 검색 결과 하단의 문서 생성 유도 배너 */
export function CreateDocumentCta({ query }: CreateDocumentCtaProps) {
  return (
    <div className="mt-8 flex flex-col items-stretch justify-between gap-3 rounded-xl sm:flex-row sm:items-center sm:gap-4 bg-surface px-5 py-[18px] elevate-1">
      <div className="flex-shrink-0 text-[13.5px] text-fg-soft">
        찾는 문서가 없나요?
      </div>
      {/* 검색어가 길면 버튼이 상자를 넘지 않고 말줄임된다 */}
      <Link
        href={ROUTES.documentNew(query)}
        className="min-w-0 truncate rounded-lg bg-accent text-center px-[14px] py-2 text-[13px] font-bold text-on-accent elevate-control transition hover:bg-accent-hover hover:text-on-accent"
      >
        {`'${query}' 문서 새로 만들기`}
      </Link>
    </div>
  );
}
