import type {
  CollaborationSnapshot,
  ConnectionStatus,
} from "../model/provider";

const STATUS: Record<
  ConnectionStatus,
  { label: string; tone: string; dot: string }
> = {
  connecting: {
    label: "연결 중…",
    tone: "bg-elevated text-fg-soft",
    dot: "bg-fg-subtle",
  },
  connected: {
    label: "실시간 연결됨",
    tone: "bg-success/12 text-success-fg",
    dot: "animate-[livepulse_2s_infinite] bg-success",
  },
  reconnecting: {
    label: "연결 끊김 · 다시 연결하는 중",
    tone: "bg-danger/10 text-danger-fg",
    dot: "bg-danger",
  },
  failed: {
    label: "연결할 수 없음",
    tone: "bg-danger/10 text-danger-fg",
    dot: "bg-danger",
  },
};

type CollaborationStatusProps = {
  snapshot: CollaborationSnapshot;
};

/**
 * 편집 화면 상단 바의 공동편집 연결 상태와 마지막 저장 결과. 시안이 없어 문서 화면의 '편집 중' 표시와 같은 알약 모양을 빌렸다.
 *
 * 저장 결과는 내가 저장했을 때뿐 아니라 같은 문서를 편집하는 다른 사람이 저장했을 때도 바뀐다 — 백엔드가 저장 완료를
 * 방 전체에 알리기 때문이다. 화면 읽기 프로그램이 상태가 바뀔 때 읽어 주도록 `aria-live`를 둔다.
 */
export function CollaborationStatus({ snapshot }: CollaborationStatusProps) {
  const status = STATUS[snapshot.status];
  const saved = snapshot.lastSaved;

  return (
    <div aria-live="polite" className="flex min-w-0 items-center gap-2.5">
      <span
        className={`flex flex-shrink-0 items-center gap-2 rounded-[20px] py-1 pl-2.5 pr-3 text-[12px] ${status.tone}`}
      >
        <span
          aria-hidden
          className={`h-[7px] w-[7px] rounded-full ${status.dot}`}
        />
        {status.label}
      </span>
      {saved && (
        <span className="truncate font-mono text-[11.5px] text-fg-subtle max-lg:hidden">
          {saved.revision === null
            ? saved.byMe
              ? "바뀐 내용이 없어 리비전을 만들지 않았습니다"
              : "다른 사람이 저장함 · 바뀐 내용 없음"
            : saved.byMe
              ? `저장함 · 리비전 ${saved.revision}`
              : `다른 사람이 저장함 · 리비전 ${saved.revision}`}
        </span>
      )}
    </div>
  );
}
