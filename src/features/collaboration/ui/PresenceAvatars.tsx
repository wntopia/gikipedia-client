import type { CSSProperties } from "react";
import { getNameInitial } from "@/entities/session";
import { presenceColorVar, type PresenceParticipant } from "../model/presence";

/** 상단 바에 얼굴로 보이는 사람 수. 넘으면 마지막 자리에 '+N'을 두고 이름은 그 툴팁에 모은다 */
const MAX_VISIBLE = 4;
/** 휴대폰 폭에서 보이는 자리 수. 상단 바에 저장 버튼까지 한 줄로 들어가도록 줄인다 */
const MOBILE_MAX_VISIBLE = 2;

/** 아바타 위에 올리면 보이는 이름표. 상단 바 아래로 펼친다 */
const TOOLTIP =
  "pointer-events-none absolute right-0 top-full z-10 mt-2 hidden whitespace-nowrap rounded-lg bg-elevated px-2.5 py-1.5 text-left text-[12px] font-medium leading-[1.5] text-fg elevate-3 group-hover:block";

/** 겹쳐 쌓는 원. 바탕색 테두리로 앞 원과 갈라 보이게 한다 */
const AVATAR =
  "flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11.5px] font-bold ring-2 ring-bg";

type PresenceAvatarsProps = {
  participants: PresenceParticipant[];
};

/**
 * 편집 화면 상단 바의 '함께 편집 중인 사람'. 나는 빼고 같은 사람의 여러 탭은 한 명으로 센다(`groupParticipants`).
 * 혼자 편집 중이면 아무것도 그리지 않는다. 색은 그 사람의 커서 · 이름표와 같아 본문의 커서가 누구인지 이어 볼 수 있다.
 *
 * 시안이 없어 계정 버튼(이니셜 원)의 모양을 작게 빌렸다. 툴팁은 포인터를 올릴 때만 보이므로, 화면 읽기
 * 프로그램에는 이름 목록을 글자로 따로 준다.
 */
export function PresenceAvatars({ participants }: PresenceAvatarsProps) {
  if (participants.length === 0) return null;

  const overflow = participants.length > MAX_VISIBLE;
  const shown = overflow
    ? participants.slice(0, MAX_VISIBLE - 1)
    : participants;
  const hidden = overflow ? participants.slice(MAX_VISIBLE - 1) : [];
  // 휴대폰 폭에서는 첫 사람과 '+N'만 보인다. 넓은 화면의 '+N'과 수가 달라 따로 그린다.
  const mobileOverflow = participants.length > MOBILE_MAX_VISIBLE;
  const mobileHidden = mobileOverflow
    ? participants.slice(MOBILE_MAX_VISIBLE - 1)
    : [];

  return (
    <div className="flex flex-shrink-0 items-center">
      <span className="sr-only">
        함께 편집 중: {participants.map((p) => p.name).join(", ")}
      </span>
      <ul aria-hidden className="flex items-center pl-1.5">
        {shown.map((participant, index) => (
          <li
            key={participant.key}
            className={`group relative -ml-1.5 ${
              mobileOverflow && index >= MOBILE_MAX_VISIBLE - 1
                ? "max-sm:hidden"
                : ""
            }`}
            style={
              {
                "--presence": presenceColorVar(participant.color),
              } as CSSProperties
            }
          >
            <span className={`${AVATAR} bg-(--presence) text-(--presence-fg)`}>
              {getNameInitial(participant.name)}
            </span>
            <span className={TOOLTIP}>
              {participant.name}
              {participant.tabs > 1 && (
                <span className="text-fg-subtle">
                  {" "}
                  · 탭 {participant.tabs}개
                </span>
              )}
            </span>
          </li>
        ))}
        {mobileOverflow && (
          <li className="group relative -ml-1.5 sm:hidden">
            <span
              className={`${AVATAR} bg-elevated font-mono text-[10.5px] text-fg-soft`}
            >
              +{mobileHidden.length}
            </span>
          </li>
        )}
        {overflow && (
          <li className="group relative -ml-1.5 max-sm:hidden">
            <span
              className={`${AVATAR} bg-elevated font-mono text-[10.5px] text-fg-soft`}
            >
              +{hidden.length}
            </span>
            <span className={TOOLTIP}>
              {hidden.map((participant) => (
                <span key={participant.key} className="block">
                  {participant.name}
                </span>
              ))}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
