import {
  WikiContent,
  type WikiBlock,
  type WikiLinkTargets,
} from "@/entities/document";
import type { ArticleResDto } from "@/shared/api";
import { formatDateTime } from "@/shared/lib";

type DocumentArticleProps = {
  article: ArticleResDto;
  /** `parseWikiText(article.content)`의 결과. 목차와 같은 파싱 결과를 쓰도록 위에서 받는다 */
  blocks: WikiBlock[];
  /** 본문 링크 대상마다 확인한 문서 id */
  linkTargets: WikiLinkTargets;
  /** 생성 뒤로 수정된 횟수 */
  editCount: number;
};

/** 문서 본문 — 분류 · 제목 · 메타 정보 · 대표 이미지 · 위키 본문 */
export function DocumentArticle({
  article,
  blocks,
  linkTargets,
  editCount,
}: DocumentArticleProps) {
  // 수정된 적 없는 문서는 updatedAt이 비어 있을 수 있어 생성 시각으로 대신한다.
  const modifiedAt = article.updatedAt ?? article.createdAt;

  return (
    <article className="min-w-0 flex-1 pb-14 pt-8 sm:pt-[52px] lg:max-w-[700px] lg:pb-[120px]">
      {article.category && (
        <div className="mb-[18px] flex flex-wrap items-center gap-2">
          <span className="rounded-[5px] bg-surface-2 elevate-control px-2 py-0.5 font-mono text-[11px] text-fg-dim">
            분류: {article.category.name}
          </span>
        </div>
      )}

      <h1 className="text-[30px] font-extrabold sm:text-[38px] leading-[1.15] tracking-[-0.025em] [overflow-wrap:anywhere]">
        {article.title}
      </h1>

      <div className="mt-[14px] flex flex-wrap items-center gap-[14px] font-mono text-xs text-fg-subtle">
        {modifiedAt && (
          <>
            <span>
              최종 수정{" "}
              <b className="text-fg-soft">{formatDateTime(modifiedAt)}</b>
            </span>
            <span className="text-faint">·</span>
          </>
        )}
        {/* 시안의 '기여자 수'는 리비전 전체를 받아야 셀 수 있어, 첫 페이지에 함께 오는 리비전 수로 수정 횟수를 보인다. */}
        <span>편집 {editCount.toLocaleString("ko-KR")}회</span>
        <span className="text-faint">·</span>
        <span>조회 {article.viewCount.toLocaleString("ko-KR")}</span>
      </div>

      {article.imageUrl && (
        <figure className="mt-8 overflow-hidden rounded-[14px] bg-surface-2 elevate-1">
          {/* 이미지 저장소 주소가 배포 환경마다 달라 next/image의 remotePatterns로 고정할 수 없고,
              올린 이미지의 크기도 알 수 없어 일반 img로 그린다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={`${article.title} 대표 이미지`}
            className="mx-auto max-h-[420px] w-auto max-w-full"
          />
        </figure>
      )}

      <div className="mt-[46px]">
        <WikiContent blocks={blocks} linkTargets={linkTargets} />
      </div>
    </article>
  );
}
