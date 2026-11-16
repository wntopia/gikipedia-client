import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLinkIcon } from "@/shared/icons";

type WikiLinkProps = {
  href: string;
  children: ReactNode;
};

// 두 링크 모두 미리 가져오지 않는다. 문서 화면은 그릴 때마다 문서를 조회하고 백엔드는 그 조회를 조회수로 세는데,
// 미리 가져오기도 화면을 그려 문서를 조회하므로 켜 두면 본문에 보이기만 한 링크 대상의 조회수가 오른다.
// '문서 없음' 화면도 그 사이 문서가 생겼으면 문서로 넘겨 주므로 같은 일이 생긴다.

/** 이미 작성된 문서로 향하는 위키 링크(파란색). */
export function WikiLink({ href, children }: WikiLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="border-b border-accent/35 text-accent"
    >
      {children}
    </Link>
  );
}

/**
 * 바깥 사이트로 가는 링크. 위키 링크와 같은 색에 화살표를 붙여 구별한다.
 * 새 탭에서 연다 — 편집 미리보기에서 눌러도 쓰던 본문이 있는 화면을 떠나지 않는다.
 * 주소는 누구나 적을 수 있어, 열린 사이트가 이 탭을 조작하거나 위키 주소를 받아 가지 못하게 `noopener noreferrer`를 붙인다.
 */
export function ExternalLink({ href, children }: WikiLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-b border-accent/35 text-accent wrap-anywhere"
    >
      {children}
      <ExternalLinkIcon className="ml-0.5 inline-block align-[-1px]" />
    </a>
  );
}

/** 아직 작성되지 않은 문서로 향하는 링크(붉은 점선). */
export function MissingLink({ href, children }: WikiLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="border-b border-dashed border-danger/45 text-danger"
    >
      {children}
    </Link>
  );
}
