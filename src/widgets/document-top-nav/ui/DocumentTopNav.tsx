import Link from "next/link";
import { AccountButton } from "@/features/auth";
import { SearchForm } from "@/features/search";
import { ROUTES } from "@/shared/config";
import { Logo } from "@/shared/ui";
import { DocumentMenu } from "./DocumentMenu";
import { EditingBadge } from "./EditingBadge";

/**
 * 문서 상세 페이지 전용 상단 네비게이션.
 * 상태가 있는 케밥 메뉴와 '편집 중' 표시만 클라이언트 컴포넌트(`DocumentMenu`, `EditingBadge`)로 떼어 두고
 * 나머지는 서버에서 그린다.
 */
export function DocumentTopNav({
  articleId,
  title,
  categoryName,
}: {
  /** 보고 있는 문서. 편집·편집 역사 링크가 같은 문서로 이어지게 한다. */
  articleId: number;
  /** 위치 경로의 끝에 보이는 문서 제목 */
  title: string;
  /** 위치 경로의 앞에 보이는 분류. 분류가 없는 문서는 제목만 보인다. */
  categoryName?: string;
}) {
  return (
    <header className="sticky top-0 z-50 bg-bg/85 elevate-header backdrop-blur-[10px]">
      <div className="mx-auto flex h-[58px] max-w-[1120px] items-center gap-2.5 px-4 sm:gap-[18px] sm:px-8">
        {/* 로고 */}
        <Link
          href={ROUTES.home}
          className="flex flex-shrink-0 items-center gap-[9px] text-base font-extrabold tracking-[-0.01em]"
        >
          <Logo />
          <span className="max-sm:sr-only">지무위키</span>
        </Link>

        {/* 위치 경로 — 제목이 길면 검색·편집 버튼을 밀어내지 않고 말줄임된다 */}
        {/* 좁은 화면에서는 본문 첫머리의 분류 · 제목과 겹쳐 빼고, 그 자리를 버튼에 준다. */}
        <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-fg-subtle md:flex">
          {categoryName && (
            <>
              <span className="flex-shrink-0">{categoryName}</span>
              <span className="flex-shrink-0">›</span>
            </>
          )}
          <span className="truncate text-fg-soft">{title}</span>
        </div>

        <div className="flex-1" />

        {/* 검색 — 휴대폰 폭에서는 편집 · 메뉴 버튼이 들어갈 자리가 없어 뺀다. 홈과 검색 화면에서 찾을 수 있다. */}
        <div className="hidden min-w-0 sm:flex">
          <SearchForm variant="compact" />
        </div>

        {/* 편집 중 표시 */}
        <EditingBadge articleId={articleId} />

        {/* 편집 버튼 */}
        <Link
          href={ROUTES.documentEdit(articleId)}
          // 편집 화면은 탭 제목에 쓸 문서를 조회한다. 미리 가져오면 문서를 열 때마다 그 조회가 한 번 더 일어나
          // 백엔드를 부르고 조회수를 셀 수 있어, 누른 뒤에만 가져온다.
          prefetch={false}
          className="flex flex-shrink-0 items-center gap-[7px] rounded-[9px] bg-surface-2 elevate-control px-3 py-2 sm:px-[15px] transition hover:elevate-1 text-[13.5px] font-semibold text-fg"
        >
          <span className="inline-block h-3 w-3 rounded-[3px] border-[1.6px] border-fg-soft" />
          편집
        </Link>

        {/* 케밥 메뉴 */}
        <DocumentMenu articleId={articleId} />

        {/* 계정 — 시안에는 없고 로그인 연동 때 더했다. 다른 헤더처럼 오른쪽 끝에 둔다. */}
        <AccountButton />
      </div>
    </header>
  );
}
