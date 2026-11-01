import {
  readArticleId,
  readRevision,
  type RevisionRouteProps,
} from "@/entities/document";
import { getArticleRevision } from "@/entities/document/server";
import { HistoryTopBar } from "@/widgets/history-top-bar";
import { RevisionViewer } from "@/widgets/revision-viewer";

/**
 * 과거 리비전 화면 — 그 리비전 시점의 본문.
 *
 * 문서 조회(`getArticle`)를 부르지 않는다. 제목은 리비전 응답에도 오고(제목은 바꿀 수 없다), 문서 조회는
 * 조회수를 올리기 때문이다. 리비전 조회는 조회수를 세지 않는다.
 */
export async function RevisionPage(props: RevisionRouteProps) {
  const articleId = await readArticleId(props);
  const revision = await getArticleRevision(
    articleId,
    await readRevision(props),
  );

  return (
    <div className="min-h-screen bg-bg text-fg">
      <HistoryTopBar articleId={articleId} documentTitle={revision.title} />

      <div className="mx-auto max-w-[1000px] px-4 pb-[120px] pt-7 sm:px-8 sm:pt-9">
        <RevisionViewer revision={revision} />
      </div>
    </div>
  );
}
