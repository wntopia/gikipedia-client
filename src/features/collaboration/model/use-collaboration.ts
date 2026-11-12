import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CollaborationProvider,
  type CollaborationOptions,
  type CollaborationSnapshot,
} from "./provider";

/** 공동편집을 쓰지 않는 화면(새 문서)이 받는 값. 연결하지 않으므로 바뀌지 않는다 */
const INACTIVE: CollaborationSnapshot = {
  status: "connecting",
  failure: null,
  unreachable: false,
  ready: false,
  text: "",
  imageUrl: null,
  lastSaved: null,
  externalContent: null,
  unmergedDraft: null,
  serverError: null,
  undelivered: false,
  oversized: false,
  awareness: null,
};

const subscribeNothing = () => () => {};
const getInactive = () => INACTIVE;

/**
 * 문서의 공동편집 연결을 화면이 떠 있는 동안 유지한다. `options`가 `null`이면 연결하지 않는다 —
 * 새 문서와 기존 문서 편집이 같은 화면 본체를 쓰고, 훅은 조건에 따라 부를 수 없어서다.
 *
 * provider는 처음 그릴 때 한 번만 만든다. 다른 문서로 옮기면 화면이 `key`로 새로 만들어져야 한다
 * (`views/edit`의 `EditPage` 참고). 연결은 화면이 붙은 뒤에 시작하고 떠날 때 끊는다.
 */
export function useCollaboration(options: CollaborationOptions | null) {
  const [provider] = useState(() =>
    options ? new CollaborationProvider(options) : null,
  );

  useEffect(() => {
    if (!provider) return;
    provider.start();
    return () => provider.stop();
  }, [provider]);

  const snapshot = useSyncExternalStore(
    provider?.subscribe ?? subscribeNothing,
    provider?.getSnapshot ?? getInactive,
    provider?.getSnapshot ?? getInactive,
  );

  return { provider, snapshot };
}
