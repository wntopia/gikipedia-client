#!/bin/bash
# 지무위키 프론트를 origin/main 최신으로 배포한다. GitHub Actions(CD)가 배포 키로 접속하면 이 스크립트만 실행된다.
#
# 돌고 있는 서비스와 다른 폴더(releases/<시각>-<커밋>)에서 받고 빌드한 뒤, 끝나면 current 링크를 바꾸고 재시작한다.
# 빌드하는 동안에도 사이트는 그대로 돌고, 빌드가 실패하면 링크를 바꾸지 않아 이전 버전이 남는다.
# 재시작 뒤 응답하지 않으면 이전 버전으로 되돌린다.
#
# 이미 배포된 커밋이면 건너뛴다. 환경 변수(shared/.env.local)만 바꿔 다시 빌드하려면 `FORCE=1 deploy.sh`로 실행한다.
set -euo pipefail

REPO=https://github.com/wntopia/gikipedia-client.git
BRANCH=main
BASE=/srv/gikipedia-frontend
RELEASES=$BASE/releases
CURRENT=$BASE/current
SHARED_ENV=$BASE/shared/.env.local
KEEP=3
SERVICE=gikipedia-frontend
HEALTH_URL=${HEALTH_URL:-http://localhost:3000/}

# 두 배포가 겹치면 같은 폴더를 함께 고친다. 앞의 배포가 끝날 때까지 기다린다.
exec 9>"$BASE/deploy.lock"
flock 9

mkdir -p "$RELEASES"
SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -c1-12)
[ -n "$SHA" ] || { echo "origin/$BRANCH 커밋을 읽지 못했다"; exit 1; }
# 같은 커밋을 다시 빌드해도 돌고 있는 폴더를 건드리지 않도록 폴더 이름에 시각을 붙인다.
TARGET=$RELEASES/$(date +%Y%m%d-%H%M%S)-$SHA
PREVIOUS=$(readlink -f "$CURRENT" 2>/dev/null || true)

PREVIOUS_NAME=$(basename "${PREVIOUS:-none}")
if [ "${FORCE:-0}" != "1" ] && [ "${PREVIOUS_NAME##*-}" = "$SHA" ]; then
  echo "이미 $SHA 가 배포되어 있다 (다시 빌드하려면 FORCE=1)"
  exit 0
fi

echo "== $SHA 빌드 ($TARGET)"
git clone -q --depth 1 --branch "$BRANCH" "$REPO" "$TARGET"
cd "$TARGET"
git log --oneline -1
cp "$SHARED_ENV" .env.local
if ! { npm ci --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npm run build; }; then
  echo "빌드 실패: 링크를 바꾸지 않는다. 지금 버전($PREVIOUS)이 그대로 돈다"
  rm -rf "$TARGET"
  exit 1
fi

echo "== 교체 후 재시작"
ln -sfn "$TARGET" "$CURRENT.tmp" && mv -Tf "$CURRENT.tmp" "$CURRENT"
sudo systemctl restart "$SERVICE"

healthy=false
for _ in $(seq 1 20); do
  sleep 2
  if curl -fs -o /dev/null --max-time 5 "$HEALTH_URL"; then healthy=true; break; fi
done

if ! $healthy; then
  echo "새 버전이 응답하지 않는다"
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    echo "== 이전 버전으로 되돌린다 ($PREVIOUS)"
    ln -sfn "$PREVIOUS" "$CURRENT.tmp" && mv -Tf "$CURRENT.tmp" "$CURRENT"
    sudo systemctl restart "$SERVICE"
    rm -rf "$TARGET"
    for _ in $(seq 1 20); do
      sleep 2
      if curl -fs -o /dev/null --max-time 5 "$HEALTH_URL"; then echo "이전 버전이 다시 응답한다"; break; fi
    done
  fi
  exit 1
fi
echo "== 배포 완료: $SHA"

# 되돌릴 수 있게 최근 몇 개만 남긴다. 지금 버전은 지우지 않는다.
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "$(readlink -f "$old")" = "$(readlink -f "$CURRENT")" ] && continue
  echo "옛 버전 정리: $old"
  rm -rf "$old"
done
