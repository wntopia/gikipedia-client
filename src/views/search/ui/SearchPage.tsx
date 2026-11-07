import { Suspense } from "react";
import type { SearchParams } from "@/shared/lib";
import { Header } from "@/widgets/header";
import { SearchNotice, SearchResultsSkeleton } from "@/widgets/search-results";
import { readSearchPage, readSearchQuery } from "../model/search-params";
import { SearchOutcome } from "./SearchOutcome";

/** 검색 결과 화면 */
export async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = readSearchQuery(params);
  const page = readSearchPage(params);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header variant="search" query={query} />

      <div className="mx-auto max-w-[900px] px-4 pb-[120px] pt-7 sm:px-8 sm:pt-10">
        {query ? (
          // 같은 화면 안에서 검색어·페이지만 바뀌면 이전 결과가 그대로 떠 있다가 바뀐다.
          // key로 새 경계를 만들어, 새 검색마다 자리표시부터 보이게 한다.
          <Suspense
            key={`${page}:${query}`}
            fallback={<SearchResultsSkeleton />}
          >
            <SearchOutcome query={query} page={page} />
          </Suspense>
        ) : (
          <SearchNotice
            title="검색어를 입력해 주세요"
            description="문서 제목과 본문에서 찾습니다."
          />
        )}
      </div>
    </div>
  );
}
