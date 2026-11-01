import Link from "next/link";
import { AccountButton } from "@/features/auth";
import { SearchForm } from "@/features/search";
import { ROUTES } from "@/shared/config";
import { Logo } from "@/shared/ui";

/** 화면마다 본문 컨테이너 폭이 달라 헤더도 같은 폭을 따라간다. */
const CONTAINER_WIDTH = {
  minimal: "max-w-[1000px]",
  home: "max-w-[1120px]",
  search: "max-w-[900px]",
  plain: "max-w-[760px]",
} as const;

/** plain을 뺀 나머지는 스크롤 시 상단에 고정되고 배경이 흐려진다. */
const STICKY = "sticky top-0 z-50 bg-bg/85 elevate-header backdrop-blur-[10px]";

type HeaderProps =
  | {
      /**
       * minimal: 로고만 노출하는 기본 형태
       * home: 검색 진입점과 계정 버튼(로그인 버튼 또는 아바타)을 함께 노출
       * plain: 로고만 노출하며 고정되지 않는 좁은 형태 (집중형 화면용)
       */
      variant?: "minimal" | "home" | "plain";
    }
  | {
      /** search: 검색어가 채워진 입력창과 계정 버튼을 노출 */
      variant: "search";
      /** 지금 검색어. 없으면 빈 입력창이 열린다. */
      query: string;
    };

/** 모든 페이지 공통 상단 네비게이션 */
export function Header(props: HeaderProps) {
  const variant = props.variant ?? "minimal";

  return (
    <header
      className={`${variant === "plain" ? "" : STICKY}`}
    >
      <div
        className={`mx-auto flex h-[58px] items-center gap-3 px-4 sm:gap-[18px] sm:px-8 ${CONTAINER_WIDTH[variant]}`}
      >
        <Link
          href={ROUTES.home}
          className="flex flex-shrink-0 items-center gap-[9px] text-base font-extrabold"
        >
          <Logo />
          {/* 검색 화면의 좁은 폭에서는 입력칸에 자리를 내주고 로고만 남긴다. */}
          <span className={variant === "search" ? "max-sm:sr-only" : undefined}>
            지무위키
          </span>
        </Link>

        {variant === "home" && (
          <>
            <div className="flex-1" />
            <SearchForm variant="compact" />
            <AccountButton />
          </>
        )}

        {props.variant === "search" && (
          <>
            {/* 검색어 없이 검색 화면에 오면 곧바로 입력할 수 있게 한다 */}
            <SearchForm
              variant="wide"
              defaultQuery={props.query}
              autoFocus={!props.query}
            />
            <AccountButton />
          </>
        )}
      </div>
    </header>
  );
}
