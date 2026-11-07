import { notFound } from "next/navigation";
import { readArticleId, type ArticleRouteProps } from "@/entities/document";
import {
  getArticle,
  getArticleRevisions,
} from "@/entities/document/server";
import type { SearchParams } from "@/shared/lib";
import { HistoryTopBar } from "@/widgets/history-top-bar";
import { RevisionStats } from "@/widgets/revision-stats";
import {
  RevisionPager,
  RevisionTimeline,
  toTimelineRevisions,
} from "@/widgets/revision-timeline";
import { countContributors } from "../model/contributors";
import { readHistoryPage } from "../model/page-param";

/** 한 페이지에 보일 리비전 수 */
const PAGE_SIZE = 30;

type EditHistoryPageProps = ArticleRouteProps & {
  searchParams: Promise<SearchParams>;
};

/** 편집 역사 화면 — 문서의 리비전 통계와 타임라인 */
export async function EditHistoryPage(props: EditHistoryPageProps) {
  const articleId = await readArticleId(props);
  const page = readHistoryPage(await props.searchParams);

  const [article, revisions, contributors] = await Promise.all([
    // 알려진 한계: 이 조회는 조회수를 올린다. 제목과 생성 시각(`createdAt`)이 문서 조회(`ArticleResDto`)에만 있고,
    // 백엔드에 조회수를 세지 않는 메타데이터 조회가 없어서다. 그래서 편집 역사로 가는 링크는 모두 미리 가져오지 않는다.
    // 백엔드가 리비전 목록에 제목 · 생성 시각을 싣거나 세지 않는 조회를 주면 이 호출을 뺀다.
    getArticle(articleId),
    getArticleRevisions(articleId, page - 1, PAGE_SIZE),
    countContributors(articleId),
  ]);

  const pageCount = Math.max(
    Math.ceil(revisions.totalElements / PAGE_SIZE),
    1,
  );
  if (page > pageCount) notFound();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <HistoryTopBar articleId={articleId} documentTitle={article.title} />

      <div className="mx-auto max-w-[1000px] px-4 pb-[120px] pt-7 sm:px-8 sm:pt-9">
        <div className="mb-7">
          <RevisionStats
            // 리비전 1은 생성 시점 내용인데 첫 수정 때에야 기록된다. 수정 전 문서도 리비전 1이 있는 셈이다.
            revisionCount={Math.max(revisions.totalElements, 1)}
            contributors={contributors}
            createdAt={article.createdAt}
          />
        </div>
        <RevisionTimeline
          revisions={toTimelineRevisions(
            revisions.items,
            revisions.totalElements,
            { articleId, createdAt: article.createdAt, now: new Date() },
          )}
        />
        <RevisionPager
          articleId={articleId}
          page={page}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}
