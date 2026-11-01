import { CategoryList } from "@/widgets/category-list";
import { Header } from "@/widgets/header";
import { HomeHero } from "@/widgets/home-hero";
import { PopularDocuments } from "@/widgets/popular-documents";
import { RecentChanges } from "@/widgets/recent-changes";
import { WikiStats } from "@/widgets/wiki-stats";
import { WriteDocumentCta } from "@/widgets/write-document-cta";

/** 그리드 한 칸. 위젯이 칸 높이를 끝까지 채워 같은 줄의 카드끼리 아랫선이 맞게 한다. */
const CELL = "flex flex-col *:flex-1";

/**
 * 홈 화면 — 위젯을 배치하고 여백만 담당한다.
 * 검색 아래를 3열 그리드 하나로 묶어 모든 카드의 윗선·아랫선이 맞게 둔다.
 *
 * 데이터 위젯은 저마다 요청 시점에 백엔드를 읽어(문서를 고치면 다음 방문에 바로 보이도록) 이 화면은 동적
 * 렌더링이다. 위젯마다 자기 Suspense 경계 안에서 불러오므로, 느리거나 실패한 위젯이 나머지를 막지 않는다.
 */
export function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header variant="home" />
      <HomeHero />

      {/* 좁은 화면에도 열을 정해 둔다. 없으면 암시적 열(auto)이 한 줄로 고정된 긴 제목만큼 넓어져 화면 밖으로 넘친다. */}
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 px-4 pb-[100px] sm:px-8 md:grid-cols-3">
        <div className={`${CELL} md:col-span-2 md:row-span-2`}>
          <RecentChanges />
        </div>
        <div className={CELL}>
          <WriteDocumentCta />
        </div>
        <div className={CELL}>
          <WikiStats />
        </div>
        <div className={`${CELL} md:col-span-2`}>
          <PopularDocuments />
        </div>
        <div className={CELL}>
          <CategoryList />
        </div>
      </div>
    </div>
  );
}
