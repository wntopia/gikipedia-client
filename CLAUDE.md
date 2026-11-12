@AGENTS.md

# 지무위키

교내 나무위키 서비스의 프론트엔드다. 학생·교사가 함께 문서를 쓰고 고치는 위키로,
문서 열람 / 검색 / 편집 / 편집역사(리비전) 화면을 갖는다.

## 지금 이 저장소의 상태 — 읽고 시작할 것

**디자인 시안을 화면으로 옮긴 단계에서, 백엔드를 하나씩 붙여 가는 중이다.**

- 백엔드와 연결된 범위는 **화면마다 다르다** — '라우팅' 절의 화면별 상태를 볼 것. 로그인·세션은 DataGSM
  OAuth로 연결되어 있고, 아직 연결되지 않은 화면의 데이터는 각 슬라이스의 `model/mock.ts`에서 온다.
- 서비스 이름은 **지무위키**다. 화면에 보이는 학교 이름("금성고등학교", "금성고")은
  디자인 시안에 들어있던 **임시 문구**이며 실제 학교가 아니다. 문서 제목
  ("2026 체육대회", "방송부"), 사용자 이름, 조회수, 날짜도 전부 시안용 더미값이다.
  이걸 근거로 도메인 규칙을 추론하지 말 것.
- 상호작용도 대부분 시각적 상태만 있다 (예: 편집 화면의 저장 버튼은 눌러도 아무 일도 하지 않는다).

즉 **구조와 스타일은 지켜야 할 것, 문자열과 데이터는 갈아끼울 것**으로 취급한다.

## 스택

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 — 설정 파일 없이 `src/app/globals.css`의 `@theme`에 토큰을 정의한다
- 폰트: Pretendard(본문, CDN) + JetBrains Mono(숫자·라벨, next/font)
- 라이트/다크 모드 — 기본은 다크. `<html>`의 `data-mode`로 전환하고 선택값은 `localStorage`에 저장한다

```
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # eslint
npm run typecheck  # 라우트 타입 생성(next typegen) 후 tsc --noEmit
```

PR마다 CI(`.github/workflows/ci.yml`)가 `lint` → `typecheck` → `build`를 돌린다. 커밋 전에 같은 명령으로 확인한다.

백엔드 주소는 `.env.local`의 `API_BASE_URL`로 준다 (`.env.example` 참고). 프록시 목적지가 빌드할 때 고정되므로 배포 빌드에서는 반드시 넣는다 (비우면 `http://localhost:8080`).

## 아키텍처 — FSD (Feature-Sliced Design)

`src/` 아래 레이어는 위에서 아래로만 의존한다. 역방향·같은 레이어 간 import 금지.

```
app/       Next.js 라우트. 페이지 파일은 views의 컴포넌트를 re-export만 한다
views/     한 화면 전체. 위젯을 배치하고 여백/레이아웃만 담당한다
widgets/   화면의 한 덩어리 (최근 변경, 헤더, 리비전 타임라인 …)
features/  사용자 동작 단위 (theme-switcher: 라이트/다크 전환, auth: 로그인·로그아웃·접근 제어, favorite-article: 문서 즐겨찾기, save-article: 문서 저장, collaboration: 실시간 공동편집)
entities/  도메인 단위 UI와 타입 (document: RecentChangeItem …, session: 로그인한 사용자)
shared/    어디서나 쓰는 것 (ROUTES, SidebarCard, WikiLink, Logo, api: 백엔드 호출, lib: 쿼리 값 읽기·날짜 포맷, icons: SVG 아이콘)
```

슬라이스 구조는 `<슬라이스>/{ui,model,api}/` + 배럴 `index.ts`. `api`는 백엔드를 호출하는 함수 자리다.
슬라이스 밖에서는 반드시 배럴로만 import 한다 (`@/widgets/header`, `@/entities/document`).
슬라이스 안에서는 상대 경로를 쓴다 (`../model/mock`).

배럴의 유일한 예외는 **서버 전용 진입점 `server.ts`** 다. `next/headers`에 의존하는 코드는 클라이언트
번들에 들어갈 수 없어 배럴에 실을 수 없으므로 `@/shared/api/server`, `@/entities/session/server`,
`@/entities/document/server`, `@/features/auth/server`처럼 따로 import 한다.

```tsx
// src/app/page.tsx — 라우트 파일은 이 이상 하지 않는다
import { HomePage } from "@/views/home";
export default HomePage;
```

주소에서 값을 받는 화면도 같다. Next가 page에 넘기는 `params` / `searchParams`를 view가 그대로 받고,
탭 제목이 데이터에 달린 화면은 view가 내보낸 함수를 `generateMetadata`로 잇기만 한다
(`app/document/[articleId]/page.tsx` 참고).

## 라우팅

경로는 `src/shared/config/routes.ts`의 `ROUTES`로만 참조한다. 문자열 하드코딩 금지.
주소에 값이 들어가는 경로는 함수다 — `ROUTES.document(articleId)`, `ROUTES.search(query)`, `ROUTES.missingDocument(title)`.

| 경로 | `ROUTES` | 화면 |
|---|---|---|
| `/` | `home` | 홈 (최근 변경, 인기 문서, 위키 현황, 분류) |
| `/document/[articleId]` | `document(id)` | 문서 상세 |
| `/document/[articleId]/edit` | `documentEdit(id)` | 문서 편집 (로그인 필요) |
| `/document/[articleId]/history?page=` | `documentHistory(id, page?)` | 편집역사. 첫 페이지는 쿼리 없이 둔다 |
| `/document/[articleId]/history/[revision]` | `documentRevision(id, revision)` | 과거 리비전 읽기. 번호는 `readRevision`으로 읽는다 (`abc`, `0`, `007` → 404) |
| `/document/new?title=` | `documentNew(title?)` | 새 문서 작성 (로그인 필요). 편집 화면의 본체를 빈 본문으로 연다 |
| `/search?q=&page=` | `search(query?, page?)` | 검색 결과. 첫 페이지는 `page` 없이 둔다 |
| `/missing-document?title=` | `missingDocument(title)` | 아직 작성되지 않은 문서의 안내 (404 핸들러가 아니다). 그 제목의 문서가 있으면 문서로 넘긴다 |
| `/mypage` | `mypage` | 마이페이지 |
| `/signin` | `signin` | 로그인. 실패하면 백엔드가 `?error&reason=…`을 붙여 이리로 돌려보낸다 |
| `/signin/callback` | `signinCallback` | 로그인 성공 후 착지 지점. 로그인 전에 보던 화면으로 곧바로 넘긴다 |

디자인에서 가져온 7개 화면이 모두 포팅되어 있다. 로그인 화면 둘과 새 문서 화면은 시안 없이 만들었다.

**문서는 제목이 아니라 숫자 `articleId`로 가리킨다.** 문서를 다루는 백엔드 API(편집·편집역사·즐겨찾기)가 모두
id로 받고, 제목은 정규화 규칙(공백·유니코드·대소문자) 때문에 한 문서에 여러 표기가 생겨 주소로 쓰기에 알맞지 않다.
제목만 아는 곳(본문의 위키 링크)은 아래 '위키 링크' 규칙대로 id를 확인하거나 `ROUTES.missingDocument(title)`로 보낸다.
`[articleId]` 아래의 view와 `generateMetadata`는 `readArticleId(props)`(`@/entities/document`)로 id를 읽는다 —
문서 id가 될 수 없는 주소(`abc`, `0`, `007`)는 여기서 404가 된다.

화면마다 백엔드 연결 상태가 다르다. 연결되지 않은 화면은 경로만 동적이고 데이터는 목이다.

- 홈: 백엔드의 최근 변경 · 인기 문서 · 위키 현황 · 분류를 그린다. 위젯마다 따로 불러 하나가 실패해도 나머지는 보인다.
- 문서: 백엔드의 문서와 최근 리비전, 지금 편집 중인 사람을 그린다. 본문의 위키 링크는 실제 문서나 '문서 없음' 화면으로 간다.
- 문서 없음: 주소의 제목과, 그 제목을 링크한 문서(백엔드 역링크 첫 20개)를 그린다.
- 검색: 백엔드 검색 결과를 `?page=`로 20개씩 나눠 그린다. 아직 쓰지 않은 문서는 결과에 나오지 않는다.
- 편집 · 새 문서: 백엔드에 저장한다. 편집은 실시간 공동편집(WebSocket)으로 고치고 저장한 뒤 편집 화면에 남고,
  새 문서는 `POST`로 만들고 문서 상세로 넘어간다.
- 편집역사: 백엔드의 리비전 목록을 `?page=`로 30개씩 나눠 그린다. '차이 보기'는 펼칠 때 직전 리비전과 그 리비전을
  받아 브라우저에서 줄 단위로 비교하고, '이 버전 보기'는 과거 리비전 화면으로 그 시점의 본문을 연다.
- 마이페이지: 프로필은 세션에서, 기여 통계 · 최근 기여(10개) · 즐겨찾기(첫 20개)는 백엔드 `users/me/*`에서 그린다.
  홈처럼 영역마다 따로 불러 하나가 실패해도 나머지는 보인다.

목 데이터에서 시안 문서를 가리킬 때는 `ROUTES.document(SAMPLE_ARTICLE_ID)`를 쓰고, 대상이 정해지지 않은
링크(다른 시안 문서)는 `#`으로 남아 있다.

`/api/v1/**` · `/ws/**` · `/callback`은 Next 라우트가 아니다. `next.config.ts`의 rewrites가 백엔드로 넘기는 프록시 경로다. `/callback`은 DataGSM이 로그인 후 돌려보내는 주소(`OAUTH_REDIRECT_PATH`)로, 백엔드 callback으로 이어진다.

## 백엔드 연동과 인증

배경과 백엔드 쪽 설정값은 README에 있다. 코드를 쓸 때 지킬 것만 적는다.

- **백엔드 호출은 `shared/api`로만 한다.** 브라우저에서는 `apiFetch`(`@/shared/api`), 서버 컴포넌트에서
  현재 사용자로서 호출할 때는 `serverApiFetch`(`@/shared/api/server`), 로그인과 무관한 공개 데이터를 요청마다
  새로 읽을 때는 `publicServerApiFetch`(`@/shared/api/server`, 홈 위젯). 경로는 `API_PATHS`로만 참조한다.
- **실패는 `ApiError`로 온다.** `isApiError(error, 404)`처럼 상태로 갈라 처리한다. 응답 타입은
  `shared/api/types.ts`에 백엔드 DTO와 같은 이름으로 둔다.
- **서버 컴포넌트에서 문서는 `getArticle` · `getArticleRevisions`(`@/entities/document/server`)로 읽는다.**
  없는 문서는 그 안에서 404로 끝난다. 화면과 `generateMetadata`가 함께 불러도 백엔드는 한 번만 불린다 —
  문서 조회는 부를 때마다 조회수를 올리기 때문이다. 시각은 `shared/lib`의 날짜 포맷(한국 시간대 고정)으로 적는다.
- **문서로 가는 `<Link>`에는 모두 `prefetch={false}`를 준다** — 목록 카드·위키 링크·역링크·상단 바의 돌아가기 링크까지.
  백엔드는 문서 조회를 조회수로 세는데, 미리 가져오기가 문서를 조회한다. Next 문서는 동적 화면의 기본 미리 가져오기가
  `loading.tsx` 경계까지만이라고 하지만, 루트 `loading.tsx`가 있는 상태에서 홈을 열기만 해도 목록 문서들의 조회수가
  오르는 것을 실제로 쟀다(#40, 리비전 조회는 없어 `generateMetadata` 쪽으로 보인다).
- **위키 링크는 본문의 대상을 모아 한 번에 확인한다** — `resolveLinkTargets(collectLinkTargets(blocks))`의 결과를
  `WikiContent`의 `linkTargets`로 넘긴다. 있으면 파란 링크(`ROUTES.document(id)`), 없으면 붉은 링크
  (`ROUTES.missingDocument(title)`)다. 조회가 실패한 대상은 '판정 불가'로 남아 붉게 칠하지 않고 '문서 없음' 화면으로
  보낸다. 그 화면이 다시 확인해 문서가 있으면 문서로 넘기므로 어느 쪽이든 제자리로 간다.
- **제목의 존재 확인은 `POST /articles/titles/lookup`으로만 한다.** `GET /articles/by-title`은 조회수를 올린다.
  제목 비교(공백·유니코드·대소문자)는 백엔드 규칙을 따르므로 프론트에서 제목끼리 견주지 않는다.
- **리비전 1은 '문서 생성'으로, 편집자 이름 없이 문서의 `createdAt`으로 그린다.** 백엔드가 첫 수정 때에야
  리비전 1을 첫 수정자 이름으로 기록하기 때문이다 (`CREATION_REVISION` 주석 참고).
- **리비전 N의 본문은 N번째 수정 직후의 본문이고, 리비전 1은 문서를 만들 때의 본문이다.** 차이 보기는 N−1 → N을
  비교하고, 직전이 없는 생성 항목에는 두지 않는다. 리비전 조회는 조회수를 세지 않으므로 과거 리비전 화면은
  문서 조회(`getArticle`) 대신 `getArticleRevision`만 쓴다. 브라우저에서는 `loadArticleRevision`으로 읽는다 —
  과거 리비전은 바뀌지 않아 담아 두고, `latest: true`인 것은 담지 않는다.
- **편집 역사 화면은 문서를 조회해 조회수를 올린다(알려진 한계).** 제목과 `createdAt`이 문서 조회에만 있고 백엔드에
  조회수를 세지 않는 메타데이터 조회가 없어서다. 그래서 편집 역사로 가는 링크(문서 메뉴 · 사이드바 '전체' · 페이지
  이동 · 과거 리비전의 '편집 역사')는 모두 `prefetch={false}`다. 백엔드에 그런 조회가 생기면 `getArticle`을 뺀다.
- **줄 비교(`diffLines`, `shared/lib`)는 메인 스레드에서 돌아 계산량 상한이 있다.** 넘으면 바뀐 구간 전체를 지우고
  더한 것으로 돌려준다(`exact: false`). 차이 보기는 한 번에 200행씩만 그린다. 둘 다 근거는 각 상수의 주석에 있다.
- **401은 화면에서 에러가 아니다.** 세션 조회(`entities/session`)는 401을 '비로그인'(`null`)으로 바꿔 준다.
- **로그인이 필요한 화면**은 view의 서버 컴포넌트 맨 앞에서 `await requireSession(ROUTES.xxx)`를 부른다
  (`views/edit`, `views/mypage` 참고). 레이아웃에서 검사하지 않는다 — 화면 이동 때 다시 실행되지 않는다.
  넘기는 값은 로그인 후 돌아올 주소라, 주소에 값이 있는 화면은 그 값까지 실어 만든다
  (`ROUTES.documentEdit(articleId)`, `ROUTES.documentNew(title)`).
- **헤더처럼 정적인 화면에 섞이는 곳**은 `useSession()`으로 브라우저에서 세션을 읽는다. 서버에서 읽으면
  그 화면 전체가 동적 렌더링이 된다.
- 로그인 시작은 `fetch`가 아니라 페이지 이동이다 (`SigninButton`). 복귀 주소는 외부 주소로 새지 않도록
  `sanitizeReturnTo`를 거친 것만 쓴다.
- `student`가 없는 계정(교사 등)도 로그인한 사용자다. 다만 백엔드의 문서 수정 API는 이런 계정에 401을 준다.
  문서 생성은 이런 계정도, 비로그인도 받지만 화면은 로그인을 요구한다 — 만든 사람이 기여 통계에 남게 하려고.

## 로딩 · 에러 · 404

- 루트에 `loading.tsx` · `error.tsx` · `not-found.tsx`를 하나씩 두고 모든 화면이 함께 쓴다
  (`views/loading`, `views/error`, `views/not-found`). 화면마다 상단 바가 달라 로딩 자리표시는 바의
  높이와 양 끝 자리만 잡는다. 공통 조각은 `shared/ui`의 `Skeleton` · `StatusNotice` · `Alert`.
- `app/error.tsx`만은 re-export 위에 `"use client"`를 둔다. Next가 이 파일의 지시문으로 클라이언트 여부를
  판단해, 가져오는 컴포넌트가 클라이언트여도 없으면 빌드가 실패한다.
- **화면을 그리다 난 실패는 잡지 말고 던진다.** 루트 `error.tsx`가 받아 '다시 시도'와 함께 안내한다.
  화면마다 에러 화면을 따로 만들지 않는다.
- **없는 대상은 `notFound()`로 끝낸다.** 없는 경로, `readArticleId`가 거른 주소, 백엔드가 404를 준 문서가
  모두 같은 404 화면으로 간다. `/missing-document`(아직 쓰지 않은 문서)와 섞지 않는다.
- 루트 `loading.tsx` 때문에 백엔드를 기다리는 화면은 응답이 스트리밍된다. 그래서 렌더링 중에 부른
  `notFound()` · `redirect()`(`requireSession` 포함)는 404 · 307이 아니라 200으로 나가고 브라우저에서
  처리된다(404 화면에는 `noindex`가 붙는다). 화면을 옮기자마자 자리표시가 뜨는 대가로 받아들였다.
- **변경 요청(저장 등)의 실패는 토스트가 아니라 그 동작을 한 자리에 `Alert`로 남긴다.** 사라지지 않아야
  무엇이 실패했는지 읽을 수 있고, 쓰던 내용을 그대로 둔 채 다시 시도할 수 있다.
- 변경 요청이 401을 받아도 로그인 화면으로 자동으로 보내지 않는다. `Alert`에 `SigninButton`을 함께 둔다.
  자동 이동은 쓰던 내용을 날리고, `student`가 없는 계정은 다시 로그인해도 401이라 같은 자리를 맴돈다.

## 편집 · 저장

- 편집 화면 본체(`views/edit`의 `EditWorkspace`)가 입력 값을 모두 들고, 저장 동작은 `features/save-article`이 맡는다
  (요청 함수, 검증, 실패 안내 문구, 이탈 경고, 대표 이미지 선택).
- **새 문서는 `POST`(`multipart/form-data`), 기존 문서의 본문은 공동편집의 `save`, 대표 이미지는 `PATCH …/image`다.**
  백엔드의 `PUT`은 편집 화면 밖의 비대화형 클라이언트용이라 쓰지 않는다. 멀티파트 요청은 `FormData`를 `apiFetch`의 `body`로 그대로
  넘긴다 — Content-Type은 fetch가 boundary와 함께 붙이므로 정하지 않는다. 요청 DTO도 `shared/api/types.ts`에 둔다.
- 기존 문서의 제목은 백엔드가 바꾸지 않아 읽기 전용이다. 편집 요약 · 가벼운 수정은 기존 문서의 저장(`save`)에만 있어 새 문서 화면에서는 숨긴다.
- `student`가 없는 계정이 편집 화면에 들어오면 고칠 수 없다는 안내를 처음부터 보인다(`findAccountProblem`).
  연결은 막지 않고 시도해 거절은 백엔드에 맡긴다 — 백엔드는 이런 계정을 공동편집 방에 들이지 않는다(1011로 닫힘).
- 검증은 백엔드 제약을 그대로 옮긴다 — 제목 1~255자(자바 `String.length`와 같은 UTF-16 단위), 본문 필수,
  편집 요약 500자, 대표 이미지 10MB. 이미지는 고르는 순간 거른다. 큰 파일은 서버가 끝까지 받은 뒤에야 거절한다.
- 편집 화면은 기존 본문을 `getArticle`로 읽어 조회수를 올린다. 조회수를 올리지 않는 최신 본문 조회가 백엔드에 없다.
  같은 계정의 30분 안 재조회는 세지 않아, 문서를 보다가 넘어오면 더 오르지 않는다. 같은 이유로 편집 링크는
  미리 가져오지 않는다(`prefetch={false}`) — 탭 제목을 위한 문서 조회가 문서를 열 때마다 일어나기 때문이다.
- **새 문서는 저장에 성공하면 `router.replace`로 문서 상세로 보낸다.** 편집 화면을 방문 기록에 남기면 뒤로 가기가 Next의
  뒤로/앞으로 캐시에서 쓰던 내용이 든 화면을 꺼내, 그대로 다시 저장하게 된다. 기존 문서는 저장해도 편집 화면에 남는다.
- 잃을 내용이 있으면 `useLeaveGuard`로 떠나기 전에 묻는다. 기존 문서는 끊긴 동안 쓴 내용 · 고른 이미지 · 편집 요약만
  해당한다 — 연결된 동안의 편집은 바로 서버에 가고, 방이 비면 백엔드가 자동 저장한다. 새로고침 · 탭 닫기 · 로그인 버튼은 `beforeunload`가,
  앱 안 링크는 `<Link onNavigate>`가 받는다. 편집 화면에 링크를 새로 두면 `onNavigate`에 걸어야 한다.
  브라우저 뒤로 가기는 Next가 취소할 방법을 주지 않아 묻지 못한다.

## 실시간 공동편집

기존 문서의 편집 화면은 `features/collaboration`으로 백엔드의 공동편집 방(`/ws/articles/{id}/collaboration`)에 붙는다.
메시지 규약은 백엔드 `docs/specs/realtime-collaboration.md`와 `CollaborationMessage`(`shared/api/types.ts`)를 본다.

- **백엔드는 Yjs 바이트를 해석하지 않는다.** 릴레이(`update` · `awareness`)와 저장(`sync` 스냅샷, `save`)만 한다.
  병합과 놓친 변경 채우기는 `CollaborationProvider`(Yjs 문서 + WebSocket)가 한다. React와는 `useCollaboration`으로 잇는다.
- **WebSocket도 프록시를 탄다.** `toWebSocketUrl(API_PATHS.articleCollaboration(id))`로 같은 오리진에 열어야 세션 쿠키가
  실린다. Next는 바깥 주소로 가는 rewrites의 업그레이드 요청을 그대로 넘긴다(문서화되지 않은 동작 — Next를 올리면 확인).
  백엔드는 Origin을 검사하므로 프론트 오리진이 백엔드 `spring.security.cors.allowed-origins`에 있어야 한다(없으면 403).
- **본문 textarea는 `Y.Text`에 직접 묶는다(`useCollaborativeText`).** 에디터를 들이지 않았다. 입력은 차이를 삭제·삽입으로,
  원격 변경은 커서를 옮겨 다시 놓는다. 한글 조합 중에는 원격 변경을 문서에 넣는 것 자체를 미룬다(`holdRemoteUpdates`).
  본문은 줄바꿈을 LF로 맞춰 넣는다(`normalizeLineBreaks`) — textarea가 CRLF를 LF로 돌려주기 때문이다.
- **저장된 본문으로 시작할 때는 결정적 update로 채운다(`createSeedUpdate`).** 진행 중 상태가 없으면 백엔드는 접속한
  모두에게 `content`를 주므로, 각자 평범하게 넣으면 본문이 두 번 들어간다. 본문 해시를 clientID로 쓰면 누가 만들어도 같은 update다.
  다시 연결했는데 서버 상태의 뿌리가 다르면(방이 비어 상태가 지워진 뒤 새로 시작됨) 합치지 않고 서버 상태로 갈아탄다.
- 놓친 변경은 접속마다 바꾸는 awareness의 `connection` 필드로 채운다. 이를 본 사람들이 자기 문서 전체를 `update`로 보낸다.
  awareness 로컬 상태의 다른 필드(이름 · 커서 등, #16)는 자유지만 `connection`은 provider 몫이다.
- **`external-update`의 본문은 자동으로 넣지 않는다.** 방 안의 저장 · 이미지 교체 뒤에도 오고(그 본문은 지금보다 오래됐을 수
  있다), 모두가 각자 넣으면 사람 수만큼 들어간다. 2초 안에 `saved`가 따라오지 않은 정말 밖의 변경만 안내하고 사람이 고른다.
  대표 이미지는 마지막 값을 바로 쓴다.
- `saved`는 방 전체에 가고 누구의 것인지 담지 않아, 내가 `save`를 보낸 뒤 처음 오는 것을 내 결과로 본다.
- 연결이 안 되면 저장 버튼을 막는다(PUT으로 대신 저장하지 않는다). 끊긴 동안의 편집은 브라우저에 쌓였다가 다시 연결되면 합쳐진다.
  재연결은 지수 백오프(1초~30초)이고, 핸드셰이크가 실패하면 세션을 조회해 로그인이 풀렸으면 멈추고 다시 로그인을 안내한다.
  로그인 문제가 아닌데 `bootstrap`까지 못 간 연결이 3번 이어지면(`unreachable`) 저장할 수 없는 이유를 `Alert`로 알리고 재연결은 계속한다.
  브라우저가 핸드셰이크 실패 사유(400 · 403 · 502)를 알려 주지 않아 원인은 가르지 않는다.
- 한 프레임은 512KB(백엔드 버퍼)를 넘지 않게 보낸다. 넘는 스냅샷은 보내지 않고 안내한다.

### 접속자 표시 (Presence)

- **awareness 로컬 상태는 `user`(`key` · `name` · `color`)와 `cursor`(`anchor` · `head`)를 쓴다.** `user`는 `usePresence`가,
  `cursor`는 textarea와 함께 붙는 `PresenceCursors`(`useLocalCursor`)가 싣는다. awareness는 연결마다 새로 생기므로
  스냅샷의 인스턴스가 바뀌면 다시 싣는다. 받은 상태는 무엇이든 올 수 있어 `readPresencePeers`로 모양을 확인하고 읽는다.
- **커서는 textarea 위치가 아니라 Yjs 상대 위치(JSON)로 보낸다.** 받는 쪽이 자기 문서로 바꿔야 동시 편집 중에도 같은 글자에
  붙는다. 같은 값은 다시 보내지 않고(중간에서 이어 치면 보내지 않는다) 한 프레임에 한 번만 보낸다. 한글 조합 중에는 보내지 않고,
  포커스를 잃거나 미리보기로 가면 지운다.
- **다른 사람의 커서는 textarea 위에 겹친 투명한 거울로 그린다.** 같은 글꼴 · 여백 · 줄바꿈으로 본문을 흘려 브라우저가 배치하게
  하고 좌표를 직접 재지 않는다. 그래서 `DocumentEditor`의 textarea 클래스를 바꾸면 `PresenceCursors`의 `MIRROR_TEXT`도
  함께 바꾼다. 거울에는 마지막 커서가 있는 줄까지만 넣는다.
- **색은 `globals.css`의 `--presence-1` ~ `--presence-8`(두 모드 모두)에서 계정 id로 결정적으로 고른다.** awareness에는 색 값이 아니라
  칸 번호를 실어 받는 사람의 모드에 맞는 색으로 그린다. 칸 번호로 고르는 값이라 `@theme`이 아니라 `:root`에 둔다.
- **같은 계정의 여러 탭은 상단 바에서 한 명이고, 나(내 다른 탭 포함)는 상단 바에서 뺀다.** 커서는 탭마다 그리고 내 다른 탭은
  '다른 탭'으로 표시한다. 계정 id와 이름(학번 제외)은 백엔드의 현재 편집자 API와 같은 기준이다.
- 떠날 때 지운 상태를 보낸다 — 화면을 옮기면 `stop`이, 탭을 닫으면 `pagehide`가 보낸다. 백엔드는 끊긴 접속을 알려 주지 않아,
  보내지 못하면(네트워크 끊김) awareness 타임아웃(30초)이 지나야 사라진다.
- **문서 화면의 '○○ 편집 중'은 `GET …/editors`를 브라우저에서 20초마다 읽는다(`EditingBadge`).** 탭이 보일 때만 읽고 다시 보이면
  바로 읽는다. 편집자가 없거나 읽지 못하면 숨긴다. 공동편집 방에 들어가면 편집자로 세어지므로 읽기 화면은 방에 붙지 않는다.

## 스타일 규칙

색은 `globals.css`의 토큰을 Tailwind 유틸로 쓴다 — `bg-bg`, `bg-surface`, `bg-surface-2`,
`bg-elevated`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-line`, `border-line-strong`,
`text-accent`, `text-success`, `text-danger`, `text-on-accent`. 컴포넌트에 hex를 직접 쓰지 않는다.

`@theme`의 값이 다크 모드이고 `:root[data-mode="light"]` 블록이 같은 변수를 덮어써 라이트
모드가 된다. 색을 추가할 때는 **두 블록 모두**에 정의한다. 한쪽 모드에서만 보일 요소는
`light:` 커스텀 variant로 가른다 (예: `light:hidden`).

영역 구분은 테두리 대신 그림자 유틸로 한다 — `elevate-control`(입력창·보조 버튼),
`elevate-1`/`elevate-2`(카드 기본/hover), `elevate-3`(드롭다운), `elevate-inset`(에디터),
`elevate-header`(고정 헤더). 위키 링크 밑줄이나 목록 구분선처럼 의미가 있는 테두리만 남긴다.

`text-[13.5px]`, `rounded-[14px]` 같은 임의값이 많은 것은 시안 수치를 그대로 맞춘 결과다.
실수가 아니므로 임의로 반올림하지 않는다.

시안은 데스크톱 화면뿐이라 **넓은 화면(`lg` 이상)이 시안 그대로이고, 좁은 화면은 `sm` · `md` · `lg` 분기로 덧붙인다.**
본문과 상단 바의 좌우 여백은 `px-4 sm:px-8`, 옆에 붙는 사이드바(문서 · 편집 · 마이페이지)는 `lg` 미만에서 본문 아래로 내린다.
상단 바가 한 줄을 넘치면 줄바꿈하지 않고 덜 중요한 것(위치 경로, 검색, 보조 버튼의 글자)부터 숨긴다.

## 컴포넌트 관례

- **SVG는 `shared/icons`에 아이콘마다 파일 하나로 두고 `@/shared/icons`로 가져다 쓴다.** 컴포넌트 안에 `<svg>`를 직접
  그리지 않는다. 색은 `currentColor`를 따르므로 감싼 요소의 글자색으로 칠하고, 크기와 선 굵기는 `size` · `strokeWidth`로 준다.
- **기본은 서버 컴포넌트.** `"use client"`는 실제 상태가 있는 파일에만 있다 (편집 화면 본체, 공동편집 안내 · 커서,
  문서 메뉴, 문서의 '편집 중' 표시, 문서 목차의 링크 목록, 리비전 카드, 테마 전환, 계정 버튼). 새로 붙일 때는 트리 최하단 컴포넌트에만 붙인다.
- **목 데이터는 슬라이스의 `model/mock.ts`에 격리한다.** 백엔드가 붙을 때 이 파일만 갈아끼우면
  되도록, UI 컴포넌트에 데이터 리터럴을 박지 않는다.
- **강조 위치는 데이터가 정한다.** 변경 요약(`ChangeSummarySegment`)과 검색 스니펫
  (`SnippetSegment`)은 문장을 조각 배열로 표현해 어디를 굵게/하이라이트할지 데이터가
  결정한다. 컴포넌트에서 문자열을 파싱하지 않는다.
- **위키 본문은 `parseWikiText` → `WikiContent`로 그린다** (`@/entities/document`). 본문을 HTML
  문자열로 주입하지 않는다. 목차는 같은 파싱 결과에 `extractToc`를 써서 제목 id가 어긋나지 않게 한다.
  지원 문법은 `entities/document/model/wiki-syntax.ts` 머리말에 있다.
- **주석은 한국어로, '무엇'이 아니라 '왜'를 적는다.** 기존 파일들이 그렇게 되어 있다.

## 디자인 원본

화면은 claude.ai 디자인 프로젝트의 `.dc.html` 시안에서 옮겨온 것이다 (DesignSync MCP).
시안과 달라 보이는 부분을 고칠 때는 원본을 먼저 확인한다.
