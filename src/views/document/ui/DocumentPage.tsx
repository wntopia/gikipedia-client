import {
  collectLinkTargets,
  extractToc,
  parseWikiText,
  readArticleId,
  resolveLinkTargets,
  type ArticleRouteProps,
} from "@/entities/document";
import { getArticle, getArticleRevisions } from "@/entities/document/server";
import { DocumentArticle } from "@/widgets/document-article";
import { DocumentToc } from "@/widgets/document-toc";
import { DocumentTopNav } from "@/widgets/document-top-nav";
import { RecentRevisions } from "@/widgets/recent-revisions";

/** 사이드바 '편집 역사'에 보이는 최근 리비전 수. 시안이 네 줄이다. */
const RECENT_REVISION_COUNT = 4;

/**
 * 문서와 본문 파싱 결과, 본문 링크 대상의 판정을 함께 읽는다.
 * 링크 확인은 본문이 있어야 시작할 수 있어, 리비전 조회를 기다리지 않고 본문이 오는 대로 이어 부른다.
 */
async function loadArticleBody(articleId: number) {
  const article = await getArticle(articleId);
  // 본문과 목차가 같은 파싱 결과를 써야 목차의 앵커가 본문 제목의 id와 어긋나지 않는다.
  const blocks = parseWikiText(article.content);
  // 링크마다 따로 묻지 않고 본문의 대상을 모아 한 번에 확인한다. 실패해도 던지지 않아 본문은 그대로 보인다.
  const linkTargets = await resolveLinkTargets(collectLinkTargets(blocks));
  return { article, blocks, linkTargets };
}

/** 문서 상세 화면 — 본문과 오른쪽의 목차 · 최근 편집 역사 */
export async function DocumentPage(props: ArticleRouteProps) {
  const articleId = await readArticleId(props);
  const [{ article, blocks, linkTargets }, revisions] = await Promise.all([
    loadArticleBody(articleId),
    getArticleRevisions(articleId, 0, RECENT_REVISION_COUNT),
  ]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <DocumentTopNav
        articleId={articleId}
        title={article.title}
        categoryName={article.category?.name}
      />

      {/* 넓은 화면은 본문 오른쪽에 사이드바를 띄우고, 좁은 화면은 본문 아래로 내린다. */}
      <div className="mx-auto flex max-w-[1120px] flex-col px-4 sm:px-8 lg:flex-row lg:gap-12">
        <DocumentArticle
          article={article}
          blocks={blocks}
          linkTargets={linkTargets}
          // 리비전 1은 생성 시점 내용이라 수정 횟수에서 뺀다.
          editCount={Math.max(revisions.totalElements - 1, 0)}
        />

        {/* 우측 플로팅 사이드바 */}
        <aside className="pb-[100px] lg:w-[260px] lg:flex-shrink-0 lg:pb-0 lg:pt-[52px]">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[78px]">
            <DocumentToc items={extractToc(blocks)} />
            <RecentRevisions
              articleId={articleId}
              revisions={revisions.items}
              totalRevisions={revisions.totalElements}
              createdAt={article.createdAt}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
