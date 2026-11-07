import Link from "next/link";
import { ROUTES } from "@/shared/config";
import { StatusNotice } from "@/shared/ui";
import { Header } from "@/widgets/header";

/**
 * 404 화면. 없는 경로, 문서 id가 될 수 없는 주소, 백엔드에 없는 문서가 모두 여기로 온다.
 *
 * '아직 작성되지 않은 문서'(`/missing-document`)와는 다르다 — 그쪽은 제목을 알아 새로 만들기를
 * 권하지만, 여기서는 무엇을 찾았는지 모르므로 검색으로 이끈다.
 */
export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header variant="plain" />

      <div className="mx-auto max-w-[760px] px-4 pb-[120px] pt-14 text-center sm:px-8 sm:pt-[90px]">
        <StatusNotice
          mark="404"
          tone="neutral"
          label="페이지 없음"
          title="페이지를 찾을 수 없습니다"
          description="주소가 잘못되었거나 없는 문서입니다. 찾는 문서가 있다면 제목으로 검색해 보세요."
          actions={
            <>
              <Link
                href={ROUTES.search()}
                className="rounded-[9px] bg-accent px-5 py-[11px] text-sm font-bold text-on-accent elevate-control transition hover:bg-accent-hover hover:text-on-accent"
              >
                문서 검색
              </Link>
              <Link
                href={ROUTES.home}
                className="rounded-[9px] bg-surface-2 elevate-control px-5 py-[11px] text-sm font-semibold text-fg-muted hover:text-fg-muted"
              >
                홈으로
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}
