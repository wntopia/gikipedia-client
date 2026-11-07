import Link from "next/link";
import {
  CREATION_REVISION,
  WikiContent,
  getEditorName,
  parseWikiText,
} from "@/entities/document";
import type { ArticleRevisionResDto } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { formatDateTime, subjectParticle } from "@/shared/lib";

type RevisionViewerProps = {
  revision: ArticleRevisionResDto;
};

/** 과거 리비전 읽기 — 어느 시점의 본문인지 알리는 안내와, 그 시점의 본문 */
export function RevisionViewer({ revision }: RevisionViewerProps) {
  const blocks = parseWikiText(revision.content);

  return (
    <>
      <RevisionNotice revision={revision} />

      {/* 문서 상세 본문과 같은 폭 · 제목 크기로 그려 지금 문서와 견주어 읽기 쉽게 한다. */}
      <article className="max-w-[700px]">
        <h1 className="text-[30px] font-extrabold sm:text-[38px] leading-[1.15] tracking-[-0.025em] [overflow-wrap:anywhere]">
          {revision.title}
        </h1>
        <div className="mt-[46px]">
          {blocks.length > 0 ? (
            <WikiContent blocks={blocks} />
          ) : (
            <p className="text-base text-fg-subtle">본문이 비어 있습니다.</p>
          )}
        </div>
      </article>
    </>
  );
}

function RevisionNotice({ revision }: RevisionViewerProps) {
  return (
    <div className="mb-10 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-xl bg-surface px-4 py-[14px] elevate-1">
      <div className="min-w-0 text-sm leading-[1.7] text-fg-muted">
        <span
          className={`mr-2 rounded-[5px] px-2 py-0.5 text-[11px] font-semibold ${
            revision.latest
              ? "bg-success/15 text-success"
              : "bg-accent/15 text-accent"
          }`}
        >
          {revision.latest ? "현재 버전" : "과거 버전"}
        </span>
        <span className="font-mono text-xs text-fg-subtle">
          리비전 {revision.revision}
        </span>
        <p className="mt-1.5 break-words">
          <RevisionDescription revision={revision} />
        </p>
        {revision.summary && (
          <p className="mt-0.5 break-words text-[13px] text-fg-subtle">
            편집 요약: {revision.summary}
          </p>
        )}
      </div>

      {/* 링크 색은 감싼 쪽에 둔다. 전역 `a { color: inherit }`가 레이어 밖에 있어 링크에 붙인 색 유틸리티를 이긴다. */}
      <nav
        aria-label="이 문서의 다른 화면"
        className="flex flex-shrink-0 items-center gap-4 pt-0.5 text-[13px] text-accent"
      >
        {/* 미리 가져오면 문서 조회가 일어나 조회수가 오른다. 지난 본문을 읽는 것은 문서 조회가 아니다. */}
        <Link href={ROUTES.document(revision.articleId)} prefetch={false}>
          현재 문서 보기
        </Link>
        {/* 편집 역사 화면도 문서를 조회한다. 미리 가져오면 지난 본문만 읽어도 조회수가 오른다. */}
        <Link
          href={ROUTES.documentHistory(revision.articleId)}
          prefetch={false}
        >
          편집 역사
        </Link>
      </nav>
    </div>
  );
}

/**
 * 리비전 1은 편집자와 시각이 생성이 아니라 첫 수정의 것으로 기록되어 있어(`CREATION_REVISION`) 누가 언제 썼는지
 * 적지 않는다. 최신 리비전의 본문은 지금 문서와 같다 — 본문은 바뀔 때마다 리비전으로 남는다.
 */
function RevisionDescription({ revision }: RevisionViewerProps) {
  if (revision.revision === CREATION_REVISION) {
    return <>문서를 처음 만들 때의 본문입니다. 지금 문서와 다를 수 있습니다.</>;
  }

  const editor = getEditorName(revision.editor);
  const when = revision.editedAt
    ? `${formatDateTime(revision.editedAt)}에 `
    : "";

  return (
    <>
      <b className="text-fg">{editor}</b>
      {subjectParticle(editor)} {when}
      {revision.latest
        ? "고친 최신 본문으로, 지금 문서와 같습니다."
        : "고친 뒤의 본문입니다. 지금 문서와 다를 수 있습니다."}
    </>
  );
}
