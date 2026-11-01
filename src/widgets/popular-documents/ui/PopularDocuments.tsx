import { Suspense } from "react";
import {
  fetchPopularArticles,
  PopularDocumentCard,
  PopularDocumentCardSkeleton,
} from "@/entities/document";
import { nullOnFailure, publicServerApiFetch } from "@/shared/api/server";
import { SidebarCard } from "@/shared/ui";

/** 홈에 보이는 문서 수. 2열 두 줄로 놓는다(420px 미만에서는 1열 네 줄). */
const POPULAR_DOCUMENT_COUNT = 4;

const GRID = "grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2";

/** 홈 그리드의 '인기 문서' 칸. 제목은 바로 그리고 문서는 불러오는 동안 자리표시를 보인다. */
export function PopularDocuments() {
  return (
    <SidebarCard title="인기 문서">
      <Suspense fallback={<PopularDocumentsSkeleton />}>
        <PopularDocumentGrid />
      </Suspense>
    </SidebarCard>
  );
}

/**
 * 누적 조회수 순위라 백엔드가 조회수를 약 30초마다 모아 반영하는 만큼 늦게 바뀐다.
 * 실패해도 이 그리드만 안내로 바꾸고 홈의 나머지는 그대로 둔다.
 */
async function PopularDocumentGrid() {
  const docs = await nullOnFailure(
    fetchPopularArticles(POPULAR_DOCUMENT_COUNT, publicServerApiFetch),
    "홈 인기 문서",
  );

  if (!docs) {
    return (
      <GridMessage>
        인기 문서를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
      </GridMessage>
    );
  }
  // 조회수가 0인 문서도 순위에 들어오므로, 비어 있으면 문서가 하나도 없는 것이다.
  if (docs.length === 0) {
    return <GridMessage>아직 작성된 문서가 없습니다.</GridMessage>;
  }

  return (
    <div className={GRID}>
      {docs.map((doc, index) => (
        <PopularDocumentCard key={doc.id} doc={doc} rank={index + 1} />
      ))}
    </div>
  );
}

function PopularDocumentsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">인기 문서를 불러오는 중…</span>
      <div className={GRID}>
        {Array.from({ length: POPULAR_DOCUMENT_COUNT }, (_, index) => (
          <PopularDocumentCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function GridMessage({ children }: { children: string }) {
  return (
    <p className="break-keep text-[13px] leading-[1.6] text-fg-subtle">
      {children}
    </p>
  );
}
