import { redirect } from "next/navigation";
import { fetchBacklinks, findArticleIdByTitle } from "@/entities/document";
import { ROUTES } from "@/shared/config";
import type { SearchParams } from "@/shared/lib";
import { Backlinks } from "@/widgets/backlinks";
import { Header } from "@/widgets/header";
import { MissingDocumentNotice } from "@/widgets/missing-document-notice";
import { readMissingDocumentTitle } from "../model/search-params";

/**
 * 한 번에 보일 역링크 수. 아직 없는 문서를 이보다 많은 문서가 링크하는 일은 드물어 페이지를 넘기지 않고
 * 나머지는 개수만 알린다.
 */
const BACKLINK_COUNT = 20;

/** 문서없음 화면 — 아직 작성되지 않은 문서의 제목으로 이동했을 때 */
export async function MissingDocumentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const title = readMissingDocumentTitle(await searchParams);

  const [articleId, backlinks] = await Promise.all([
    // 실패하면 던진다. 문서가 있는지 모르는 채로 '없다'고 안내하면 이미 있는 제목으로 새 문서를 만들러 가게 된다.
    findArticleIdByTitle(title),
    // 역링크는 덧붙이는 정보라, 불러오지 못해도 문서를 새로 만드는 안내는 보여야 한다.
    fetchBacklinks(title, { page: 0, size: BACKLINK_COUNT }).catch(() => null),
  ]);

  // 붉은 링크는 링크를 건 문서를 그린 때의 판정이라 그 사이 누가 문서를 만들었을 수 있고, 존재를 확인하지 못한
  // 링크도 이리로 온다. 어느 쪽이든 문서가 있으면 그 문서를 보여 주는 것이 링크를 누른 뜻이다.
  if (articleId !== null) redirect(ROUTES.document(articleId));

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header variant="plain" />

      <div className="mx-auto max-w-[760px] px-4 pb-[120px] pt-14 text-center sm:px-8 sm:pt-[90px]">
        <MissingDocumentNotice title={title} />
        <div className="mt-12 sm:mt-[60px]">
          <Backlinks backlinks={backlinks} />
        </div>
      </div>
    </div>
  );
}
