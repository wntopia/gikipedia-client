import Link from "next/link";
import { ROUTES } from "@/shared/config";

type MissingDocumentNoticeProps = {
  /** 아직 만들어지지 않은 문서의 제목 */
  title: string;
};

/** 문서가 없음을 알리고 생성·검색으로 유도하는 안내 */
export function MissingDocumentNotice({ title }: MissingDocumentNoticeProps) {
  return (
    <section>
      <div className="mx-auto mb-[26px] flex h-14 w-14 items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-danger font-mono text-2xl text-danger">
        ?
      </div>

      <div className="mb-2.5 font-mono text-xs uppercase tracking-[.1em] text-fg-subtle">
        문서 없음
      </div>
      {/* 제목은 주소에서 오므로 띄어쓰기 없이 길 수 있다. 화면 밖으로 넘치지 않게 한다 */}
      <h1 className="mb-[14px] break-keep text-[24px] font-extrabold sm:text-[28px] [overflow-wrap:anywhere]">
        {`'${title}' 문서가 아직 없습니다`}
      </h1>
      <p className="mx-auto mb-[30px] max-w-[480px] break-keep text-[15px] leading-[1.8] text-fg-soft">
        {/* 시안은 '다른 문서에서 링크되었지만'으로 시작하지만, 검색이나 주소로 들어와 링크한 문서가 없을 때도
            보이는 화면이라 어느 경우에나 맞는 문장으로 바꿨다. */}
        아직 아무도 작성하지 않은 문서입니다. 알고 있는 내용이 있다면 지금 첫
        문단을 작성해보세요.
      </p>

      <div className="flex flex-wrap justify-center gap-2.5">
        <Link
          href={ROUTES.documentNew(title)}
          className="rounded-[9px] bg-accent px-5 py-[11px] text-sm font-bold text-on-accent elevate-control transition hover:bg-accent-hover hover:text-on-accent"
        >
          이 문서 새로 만들기
        </Link>
        <Link
          href={ROUTES.search(title)}
          className="rounded-[9px] bg-surface-2 elevate-control px-5 py-[11px] text-sm font-semibold text-fg-muted hover:text-fg-muted"
        >
          비슷한 문서 찾기
        </Link>
      </div>
    </section>
  );
}
