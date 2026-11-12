# frontend

지무위키(교내 위키) 프론트엔드. 구조와 규칙은 [CLAUDE.md](./CLAUDE.md)에 있다.

## 실행

Node.js 24가 필요하다 (`.nvmrc`, CI도 같은 버전을 쓴다).

```bash
cp .env.example .env.local   # API_BASE_URL을 채운다 (아래 '어느 백엔드에 붙일까')
npm install
npm run dev                  # http://localhost:3000
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build`, `npm start` | 프로덕션 빌드와 그 결과 실행 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 라우트 타입을 만든 뒤(`next typegen`) `tsc --noEmit` |

PR을 올리면 CI(`.github/workflows/ci.yml`)가 `npm ci` → `lint` → `typecheck` → `build`를 차례로 돌리고,
하나라도 실패하면 PR에 실패로 표시된다. 올리기 전에 같은 명령을 로컬에서 돌려 보면 된다.

## 구조

[Feature-Sliced Design](https://feature-sliced.design/)을 따른다. `src/` 아래 레이어는 위에서 아래로만 의존한다.

| 레이어 | 담는 것 |
|---|---|
| `app/` | Next.js 라우트. 페이지 파일은 `views`의 화면을 다시 내보내기만 한다 |
| `views/` | 한 화면 전체. FSD의 `pages`인데, `src/pages`는 Next가 Pages Router로 읽어서 이름을 바꿨다 |
| `widgets/` | 화면의 한 덩어리 (헤더, 최근 변경, 리비전 타임라인 …) |
| `features/` | 사용자 동작 단위 (로그인·로그아웃, 라이트/다크 전환) |
| `entities/` | 도메인 단위의 UI · 타입 · 조회 (문서, 세션) |
| `shared/` | 어디서나 쓰는 것 (라우트 상수, API 클라이언트, 공용 UI) |

슬라이스 바깥에서는 배럴(`index.ts`)로만 import 한다. 라우팅 · 스타일 · 컴포넌트 규칙은 [CLAUDE.md](./CLAUDE.md)에 있다.

## 백엔드 연동

백엔드는 [`wntopia/gikipedia-server`](https://github.com/wntopia/gikipedia-server)이고,
호출 코드는 `src/shared/api`에 모여 있다.

| 환경 변수 | 설명 |
|---|---|
| `API_BASE_URL` | 백엔드 오리진 (예: `http://localhost:8080`). 서버 전용 값이며 **빌드 시점에 프록시 목적지로 고정된다**. 비우면 `http://localhost:8080`으로 빌드되므로 배포 빌드에서는 반드시 넣는다 |

### 어느 백엔드에 붙일까

- **팀 개발 서버** — 백엔드의 `develop` 브랜치가 배포되는 스테이지 서버다. 주소는 팀에서 받는다.
- **로컬 백엔드** — 백엔드 저장소를 받아 띄우고 `http://localhost:8080`(`.env.example`의 값)을 넣는다.
  MySQL · MongoDB · Redis · SeaweedFS는 백엔드 저장소의 `docker-compose.yml`로 띄우고, 설정은
  `application.yaml.example`을 참고한다. 로그인까지 쓰려면 아래 '로그인이 동작하려면'의 값을 맞춘다.

`API_BASE_URL`을 바꾸면 개발 서버를 다시 띄운다. 프록시 목적지는 서버를 띄울 때(배포본은 빌드할 때) 고정된다.

로그인은 프론트가 백엔드의 `DATAGSM_OAUTH_REDIRECT_URI`와 같은 오리진에 떠 있을 때만 끝까지 된다.
지금 팀 개발 서버는 배포 주소(`https://gikipedia.https.gsmsv.site/callback`)로 맞춰 두어, 로컬(`localhost:3000`)에서
개발 서버에 붙이면 화면과 공개 데이터는 보이지만 로그인은 끝까지 되지 않는다. 로그인이 필요한 화면은 로컬 백엔드를
`http://localhost:3000/callback`으로 띄워 확인한다.

### 브라우저는 백엔드를 직접 부르지 않는다 (rewrites 프록시)

브라우저는 프론트 오리진의 `/api/v1/**`를 호출하고, `next.config.ts`의 `rewrites`가 이를
`API_BASE_URL`로 넘긴다. 백엔드를 직접 호출(CORS)하지 않고 프록시를 택한 이유는 다음과 같다.

- 백엔드 인증은 세션 쿠키다. 프록시를 거치면 쿠키가 **프론트 도메인**에 붙어, 서버 컴포넌트가
  요청 쿠키를 그대로 백엔드에 전달해 로그인 여부를 확인할 수 있다. 덕분에 편집·마이페이지 같은
  화면을 그리기 전에 서버에서 막을 수 있다.
- 직접 호출 방식은 프론트와 백엔드의 도메인이 다르면 Next 서버가 쿠키를 볼 수 없어 접근 제어를
  브라우저에서만 할 수 있고, 서드파티 쿠키 제한의 영향도 받는다.

실시간 공동편집 WebSocket(`/ws/**`)도 같은 rewrites로 백엔드에 넘긴다. 핸드셰이크에 세션 쿠키가 실리려면 같은 오리진이어야
하기 때문이다. 백엔드는 WebSocket의 `Origin`을 검사하므로 **프론트 오리진을 백엔드의 `spring.security.cors.allowed-origins`에
넣어야 한다** (빠지면 핸드셰이크가 403이고, 편집 화면은 다시 연결을 시도하다 '공동편집 서버에 연결할 수 없습니다'를 띄운다).
WebSocket 업그레이드를 넘기지 않는 호스팅(Vercel의 rewrites 등)에서는 핸드셰이크가 400이 되어 문서를 고칠 수 없다.
그래서 배포는 Next 서버를 직접 띄우는 온프레미스 서버로 한다(아래 '배포').

호출 함수는 실행 위치와 쓰임에 따라 셋으로 나뉜다.

| 함수 | import | 용도 |
|---|---|---|
| `apiFetch` | `@/shared/api` | 브라우저(프록시 경유, 쿠키 포함), 그리고 서버에서 로그인과 무관한 조회 |
| `serverApiFetch` | `@/shared/api/server` | 서버 컴포넌트에서 현재 사용자로서 호출 (요청 쿠키를 옮겨 싣는다) |
| `publicServerApiFetch` | `@/shared/api/server` | 서버 컴포넌트에서 로그인과 무관한 공개 데이터를 요청마다 새로 조회 (쿠키를 싣지 않고, 빌드 때는 부르지 않는다) |

서버 컴포넌트에서 `apiFetch`를 그대로 부르면 정적인 화면은 빌드 때 한 번 조회한 값으로 굳는다. 홈의 최근 변경처럼
바로 반영되어야 하는 값은 `publicServerApiFetch`로 부른다.

셋 다 the-sdk의 응답 봉투(`{ status, code, message, data }`)를 벗겨 `data`만 돌려주고,
2xx가 아니면 HTTP 상태를 담은 `ApiError`를 던진다. `isApiError(error, 404)`처럼 갈라 쓴다.

### 로그인이 동작하려면 백엔드 설정이 맞아야 한다

로그인은 `fetch`가 아니라 페이지 이동이다. 브라우저가 `/api/v1/oauth/datagsm/signin`(프록시)으로
이동하면 백엔드가 DataGSM으로 보내고, DataGSM은 로그인이 끝나면 `redirect_uri`로 돌려보낸다. 세션 쿠키가
프론트 도메인에 있으므로 **`redirect_uri`도 프론트 오리진이어야** 한다. 프론트는 `/callback`으로 돌아온
요청을 `code`·`state`째로 백엔드 callback에 넘긴다 (`next.config.ts`). 백엔드 도메인으로 돌려보내면
쿠키가 따라가지 않아 `OAuth state가 올바르지 않습니다`로 실패한다.

| 백엔드 환경 변수 | 값 |
|---|---|
| `DATAGSM_OAUTH_REDIRECT_URI` | `<프론트 오리진>/callback` — DataGSM 클라이언트에도 등록. 글자 하나까지 같아야 통과한다 |
| `DATAGSM_OAUTH_SCOPE` | 비워 두거나 `datagsm:self_read` |
| `DATAGSM_OAUTH_SUCCESS_REDIRECT_URI` | `/signin/callback` |
| `DATAGSM_OAUTH_FAILURE_REDIRECT_URI` | `/signin?error` (기본값 그대로) |

성공·실패 주소는 상대 경로라 브라우저가 프론트 오리진 기준으로 해석한다. 로그인 전에 보던 화면은
백엔드가 기억해 주지 않으므로 프론트가 `sessionStorage`에 맡겨 두었다가 `/signin/callback`에서 꺼내 이동한다.

## 배포

`main`에 머지되면 CI가 통과한 뒤 CD(`.github/workflows/cd.yml`)가 온프레미스 서버에 배포한다.
Actions 탭의 CD에서 'Run workflow'로 손으로 다시 배포할 수도 있다.

| 항목 | 값 |
|---|---|
| 주소 | `https://gikipedia.https.gsmsv.site` (gsmsv 콘솔의 HTTPS 도메인 → VM 내부 포트 3000) |
| 실행 | systemd `gikipedia-frontend`가 `/srv/gikipedia-frontend/current`에서 `next start -p 3000` |
| 배포 스크립트 | `/srv/gikipedia-frontend/deploy.sh` (`/srv/deploy.sh`는 이 파일로 가는 링크) |
| 환경 변수 | `/srv/gikipedia-frontend/shared/.env.local` (`API_BASE_URL`). 배포 때마다 빌드 폴더로 복사된다 |

배포 스크립트는 `origin/main`을 `releases/<커밋>`에 따로 받아 `npm ci` · `npm run build`를 하고, 끝나면 `current` 링크를
바꾼 뒤 재시작한다. 빌드하는 동안에도 사이트는 이전 버전으로 돌고, 빌드가 실패하면 링크를 바꾸지 않는다.
재시작 뒤 응답이 없으면 이전 버전으로 되돌린다. 최근 3개 버전만 남긴다.

CD는 저장소 Secrets의 배포 전용 키(`DEPLOY_SSH_*`)로 접속한다. 서버는 이 키에 배포 스크립트만 허용한다
(`authorized_keys`의 `restrict,command=`). 이전 버전으로 손으로 되돌리려면 서버에서 `current` 링크를
`releases/` 아래 다른 폴더로 바꾸고 `sudo systemctl restart gikipedia-frontend`를 실행한다.

`API_BASE_URL`을 바꾸려면 `shared/.env.local`을 고친 뒤 서버에서 `FORCE=1 /srv/deploy.sh`로 다시 빌드한다. 빌드할 때 고정되는 값이라
재시작만으로는 바뀌지 않고, 같은 커밋은 `FORCE=1` 없이는 건너뛴다.

배포 스크립트와 systemd 설정의 원본은 저장소의 `deploy/`다. CD는 서버에 있는 사본을 실행하므로, `deploy/`를 고쳐 머지했다면
서버의 `/srv/gikipedia-frontend/deploy.sh`(설정은 `/etc/systemd/system/gikipedia-frontend.service` 후 `sudo systemctl daemon-reload`)에도 복사한다.

## 기여

- 이슈는 ToDo / Bug 양식으로 연다. 제목은 `[영역] 내용`이다 — 영역은 바뀌는 화면이나 슬라이스 이름
  (`document`, `history`, `edit`, `search`, `auth` …), 여러 곳에 걸치면 `global`, CI는 `ci/cd`.
- 커밋 메시지는 `type(scope): 설명`이다. type은 `add` · `update` · `fix` · `refactor` · `docs` 등이고 설명은 한국어로 쓴다.
- PR은 템플릿을 채워 올리고, 이슈를 닫는다면 `Closes #번호`를 넣는다. PR을 처음 열면 Claude가 diff를 리뷰해
  코멘트를 남긴다(`.github/workflows/claude-code-review.yml`). 다시 리뷰받으려면 PR에 `/claude-review` 댓글을 단다.
