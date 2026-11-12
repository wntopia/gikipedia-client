import type { CollaborationSnapshot } from "./provider";

/** 편집 화면의 안내 자리(`Alert`)에 그대로 들어가는 모양. `features/save-article`의 안내와 같다 */
export type ConnectionProblem = {
  title: string;
  message: string;
  detail?: string;
  /** 다시 로그인하면 풀린다. 화면이 로그인 버튼을 함께 보인다 */
  needsSignin?: boolean;
};

/**
 * 사람이 알아야 할 연결 실패를 안내로 바꾼다. 다시 연결해도 풀리지 않는 실패와, 다시 시도 중이지만 연달아 실패해
 * 서버에 닿지 않는 상태(`unreachable`)다. 잠깐의 끊김은 상단 바의 연결 상태로만 보인다.
 *
 * `student`가 없는 계정의 거절(`rejected`)은 화면이 들어오자마자 보이는 계정 안내가 이미 같은 말을 하므로 겹쳐 보이지 않는다.
 */
export function describeConnectionProblem(
  snapshot: CollaborationSnapshot,
): ConnectionProblem | null {
  if (snapshot.failure === "unauthorized") {
    return {
      title: "로그인이 풀렸습니다.",
      message:
        "다시 로그인하면 이 화면으로 돌아와 공동편집에 다시 들어갑니다. 연결이 끊긴 뒤에 쓴 내용은 먼저 복사해 두세요.",
      needsSignin: true,
    };
  }
  if (snapshot.failure !== null || !snapshot.unreachable) return null;
  // 브라우저는 핸드셰이크가 실패한 이유를 알려 주지 않아 원인은 적지 않는다.
  // 한 번도 연결하지 못했으면 본문이 읽기 전용이라, 쓴 내용이 남는다는 말은 연결된 적이 있을 때만 한다.
  return {
    title: "공동편집 서버에 연결할 수 없습니다.",
    message: snapshot.ready
      ? // 오래 끊긴 사이 방이 비고 다른 사람이 저장했으면 합치지 못하고 따로 빼 둔다(`unmergedDraft`). 그래서 단정하지 않는다.
        "지금은 서버에 닿지 않아 저장할 수 없습니다. 연결은 자동으로 계속 다시 시도합니다. 그동안 쓴 내용은 이 브라우저에 남아 있다가 다시 연결되면 합쳐지고, 합치지 못하면 따로 알려 드립니다."
      : "지금은 서버에 닿지 않아 본문을 고치거나 저장할 수 없습니다. 연결은 자동으로 계속 다시 시도하고, 연결되면 바로 편집할 수 있습니다.",
  };
}
