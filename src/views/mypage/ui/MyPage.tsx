import Link from "next/link";
import type { DocumentActivity } from "@/entities/document";
import { getClassLabel, getDisplayName, getInitial } from "@/entities/session";
import { SignoutButton } from "@/features/auth";
import { requireSession } from "@/features/auth/server";
import { nullOnFailure, serverApiFetch } from "@/shared/api/server";
import { ROUTES } from "@/shared/config";
import { Header } from "@/widgets/header";
import {
  fetchMyContributionStats,
  fetchMyContributions,
  fetchMyFavorites,
} from "../api/my-activity";
import {
  toContribution,
  toFavoriteList,
  toMyStats,
} from "../model/my-activity";

/** 최근 기여는 페이지 없이 이만큼만 보인다. */
const CONTRIBUTION_LIMIT = 10;
/** 즐겨찾기는 첫 페이지만 보이고, 나머지는 개수만 적는다. */
const FAVORITE_PAGE = { page: 0, size: 20 };

const ACTIVITY_DOT: Record<DocumentActivity, string> = {
  active: "bg-success",
  created: "bg-accent/60",
  idle: "bg-faint",
};

/**
 * 마이페이지. 로그인한 사용자만 들어올 수 있다.
 *
 * 통계 · 최근 기여 · 즐겨찾기는 따로 불러, 하나가 실패해도 그 자리만 안내로 바꾸고 나머지는 보인다.
 * 프로필 편집은 저장할 API가 없어 빼 두었다. 눌러도 동작하지 않는 버튼은 사실과 다른 화면이 되기 때문이다.
 */
export async function MyPage() {
  const user = await requireSession(ROUTES.mypage);
  const [statsRes, contributionsRes, favoritesRes] = await Promise.all([
    nullOnFailure(fetchMyContributionStats(serverApiFetch), "마이페이지 통계"),
    nullOnFailure(
      fetchMyContributions(CONTRIBUTION_LIMIT, serverApiFetch),
      "마이페이지 최근 기여",
    ),
    nullOnFailure(
      fetchMyFavorites(FAVORITE_PAGE, serverApiFetch),
      "마이페이지 즐겨찾기",
    ),
  ]);
  const now = new Date();
  const myStats = statsRes && toMyStats(statsRes);
  const myContributions =
    contributionsRes?.map((c) => toContribution(c, now)) ?? null;
  const myFavorites = favoritesRes && toFavoriteList(favoritesRes);

  // 학년 · 반을 알 수 없는 계정(교사 등 학생이 아닌 계정, 값이 비어 온 학생)은
  // 어떤 계정으로 들어왔는지 알 수 있게 이메일을 보인다.
  const caption = [
    getClassLabel(user) ?? user.email,
    myStats && `${myStats.joinedOn} 가입`,
  ]
    .filter(Boolean)
    .join(" · ");

  // 통계를 불러오지 못했을 때 0을 보이면 '편집한 적이 없다'는 뜻이 되므로 값 자리를 비워 표시한다.
  const stats = [
    { value: myStats?.totalEdits, label: "총 편집 수", color: "text-accent" },
    {
      value: myStats?.createdDocuments,
      label: "새로 만든 문서",
      color: "text-success",
    },
    {
      value: myStats && `${myStats.todayEdits}회`,
      label: "오늘 편집",
      color: "text-fg",
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header variant="home" />

      <div className="mx-auto max-w-[1120px] px-4 pb-[120px] pt-8 sm:px-8 sm:pt-11">
        {/* 프로필 */}
        <div className="mb-[34px] flex items-center gap-3.5 sm:gap-[18px]">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-elevated elevate-2 text-xl font-bold text-fg-muted sm:h-16 sm:w-16 sm:text-[22px]">
            {getInitial(user)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[19px] font-extrabold sm:text-[21px]">
              {getDisplayName(user)}
            </div>
            {caption && (
              <div className="mt-[3px] font-mono text-xs text-fg-subtle [overflow-wrap:anywhere]">
                {caption}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <SignoutButton />
          </div>
        </div>

        {/* 통계 */}
        <div className="mb-9 flex gap-2 sm:gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="min-w-0 flex-1 rounded-xl bg-surface p-3 elevate-1 sm:p-4"
            >
              <div
                className={`font-mono text-[22px] font-bold ${
                  s.value == null ? "text-fg-subtle" : s.color
                }`}
              >
                {s.value ?? "—"}
              </div>
              <div className="mt-[3px] break-keep text-[12.5px] text-fg-subtle">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* 최근 기여 + 즐겨찾기 — 좁은 화면에서는 즐겨찾기를 아래로 내린다 */}
        <div className="flex flex-col gap-9 lg:flex-row lg:gap-10">
          <div className="min-w-0 flex-1">
            <div className="mb-[14px] text-base font-bold">최근 기여</div>
            <div className="overflow-hidden rounded-xl bg-surface elevate-1">
              {myContributions === null ? (
                <p className="px-4 py-[13px] text-[13.5px] text-fg-subtle">
                  최근 기여를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
                </p>
              ) : myContributions.length > 0 ? (
                myContributions.map((c, i) => (
                  <Link
                    // 같은 문서를 여러 번 고치면 같은 문서가 여러 줄 온다.
                    key={i}
                    href={ROUTES.document(c.articleId)}
                    // 문서 조회는 조회수를 올리므로 미리 가져오지 않는다.
                    prefetch={false}
                    className={`flex items-center gap-3 px-4 py-[13px] transition-colors hover:bg-row-hover ${
                      i < myContributions.length - 1
                        ? "border-b border-divider"
                        : ""
                    }`}
                  >
                    <span
                      className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${ACTIVITY_DOT[c.activity]}`}
                    />
                    {/* 제목이 길어도 생성인지 수정인지는 보이도록 말줄임은 제목에만 건다. */}
                    <div className="flex min-w-0 flex-1 gap-1 text-[13.5px] text-fg-muted">
                      <span className="truncate font-semibold text-fg">
                        {c.title}
                      </span>
                      <span className="flex-shrink-0">{c.action}</span>
                    </div>
                    <span className="flex-shrink-0 font-mono text-[11px] text-fg-subtle">
                      {c.time}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-[13px] text-[13.5px] text-fg-subtle">
                  최근 기여가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className="lg:w-[320px] lg:flex-shrink-0">
            <div className="mb-[14px] text-base font-bold">즐겨찾는 문서</div>
            <div className="rounded-xl bg-surface p-1.5 elevate-1">
              {myFavorites === null ? (
                <p className="break-keep px-[11px] py-[9px] text-[13.5px] text-fg-subtle">
                  즐겨찾는 문서를 불러오지 못했습니다.
                </p>
              ) : myFavorites.items.length > 0 ? (
                <>
                  {myFavorites.items.map((f) => (
                    <Link
                      key={f.articleId}
                      href={ROUTES.document(f.articleId)}
                      prefetch={false}
                      className="block truncate rounded-[7px] px-[11px] py-[9px] text-[13.5px] text-fg-muted transition-colors hover:bg-hover"
                    >
                      {f.title}
                    </Link>
                  ))}
                  {myFavorites.restCount > 0 && (
                    // 즐겨찾기 전체를 볼 화면이 아직 없어 개수만 알린다.
                    <p className="px-[11px] py-[9px] text-[12.5px] text-fg-subtle">
                      외 {myFavorites.restCount.toLocaleString("ko-KR")}개
                    </p>
                  )}
                </>
              ) : (
                <p className="px-[11px] py-[9px] text-[13.5px] text-fg-subtle">
                  즐겨찾는 문서가 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
