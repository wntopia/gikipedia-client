"use client";

import Link from "next/link";
import { ROUTES } from "@/shared/config";
import { StatusNotice } from "@/shared/ui";
import { Header } from "@/widgets/header";

type ErrorPageProps = {
  /** 서버에서 난 에러는 운영 빌드에서 메시지가 가려지고 서버 로그와 맞춰 볼 `digest`만 온다. */
  error: Error & { digest?: string };
  /** 화면을 서버에서 다시 받아 그린다. 백엔드가 잠깐 끊겼던 경우라면 이걸로 복구된다. */
  unstable_retry: () => void;
};

/**
 * 화면을 그리다 실패했을 때(백엔드 장애 등) 화면 대신 보이는 안내.
 * Next의 에러 경계라 클라이언트 컴포넌트여야 한다.
 *
 * 실패한 화면의 상단 바도 함께 사라지므로 로고만 있는 헤더를 둔다.
 */
export function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header variant="plain" />

      <div className="mx-auto max-w-[760px] px-4 pb-[120px] pt-14 text-center sm:px-8 sm:pt-[90px]">
        <StatusNotice
          mark="!"
          tone="danger"
          label="오류"
          title="화면을 불러오지 못했습니다"
          description="서버와 연결이 원활하지 않거나 일시적인 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
          actions={
            <>
              {/* 누르면 이 화면이 곧바로 로딩 자리표시로 바뀌어, 따로 진행 상태를 두지 않는다. */}
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="cursor-pointer rounded-[9px] bg-accent px-5 py-[11px] text-sm font-bold text-on-accent elevate-control transition hover:bg-accent-hover"
              >
                다시 시도
              </button>
              <Link
                href={ROUTES.home}
                className="rounded-[9px] bg-surface-2 elevate-control px-5 py-[11px] text-sm font-semibold text-fg-muted hover:text-fg-muted"
              >
                홈으로
              </Link>
            </>
          }
          footnote={error.digest && `오류 코드 ${error.digest}`}
        />
      </div>
    </div>
  );
}
