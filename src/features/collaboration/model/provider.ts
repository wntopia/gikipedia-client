import * as Y from "yjs";
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { fetchSession } from "@/entities/session";
import type { CollaborationMessage } from "@/shared/api";
import { base64ToBytes, bytesToBase64 } from "@/shared/lib";
import { openCollaborationSocket } from "../api/socket";
import { createSeedUpdate, normalizeLineBreaks, TEXT_NAME } from "./seed";
import { diffText } from "./text-diff";

/**
 * 백엔드의 WebSocket 메시지 버퍼 크기(`CollaborationWebSocketConfig`). 이보다 큰 프레임은 서버가 연결을 끊는다.
 * 서버(Tomcat)는 글자 수로 세지만, 다른 컨테이너로 바뀌어도 넘지 않도록 더 엄격한 UTF-8 바이트로 센다.
 */
export const MAX_MESSAGE_BYTES = 512 * 1024;

/**
 * 전체 스냅샷(`sync`)을 보내는 간격. 백엔드 스펙의 권장값(3~5초) 가운데다. 이 스냅샷이 늦게 들어온 사람의 시작 상태와
 * 마지막 사람이 나간 뒤의 자동 저장(안전망) 내용이 되므로, 계속 입력해도 이 간격을 넘겨 미루지 않는다.
 */
const SYNC_DELAY_MS = 4_000;
/** `save`를 보낸 뒤 `saved`를 기다리는 시간. 넘기면 저장 여부를 알 수 없다고 알린다. */
const SAVE_TIMEOUT_MS = 20_000;
/**
 * 방 안에서 저장해도 백엔드는 `external-update`를 먼저 보내고 바로 뒤에 `saved`를 보낸다. 이 시간 안에 `saved`가
 * 오면 방 안의 저장으로 보고, 오지 않으면 편집 화면 밖(PUT 등)에서 바뀐 것으로 본다.
 */
const EXTERNAL_SETTLE_MS = 2_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
/**
 * `bootstrap`까지 가지 못한 연결이 이만큼 이어지면 서버에 닿지 않는다고 안내한다(`unreachable`). 다시 시도는 그대로 한다.
 *
 * 브라우저는 핸드셰이크가 실패한 이유(400 · 403 · 502 …)를 알려 주지 않아(닫힘 코드 1006) 원인으로는 가를 수 없고
 * 연속 실패 횟수로 정한다. 서버 재시작이나 네트워크 전환 같은 잠깐의 끊김은 한두 번 안에 풀리므로 그때는 상단 바의
 * 상태만 바꾼다. 바로 거절되는 경우 세 번째 실패는 백오프(1초 · 2초)를 지나 약 3초 뒤라, 고칠 수 없는 본문과 막힌
 * 저장 버튼을 이유 없이 보는 시간이 길지 않다.
 */
const UNREACHABLE_AFTER_FAILURES = 3;
/**
 * 네트워크가 끊겨도 브라우저는 TCP가 포기할 때까지(수 분) `close`를 주지 않는다. 보낸 데이터가 이 간격으로 세 번
 * 연속 빠져나가지 않거나 연결이 이만큼 열리지 않으면 끊긴 것으로 보고 다시 연결한다.
 */
const WATCHDOG_INTERVAL_MS = 5_000;
const STALLED_TICKS_LIMIT = 3;
const CONNECT_TIMEOUT_MS = 15_000;
/** 새로 들어온 사람에게 지금 상태를 보내기 전에 기다리는 시간. 여러 사람이 한꺼번에 들어와도 한 번만 보낸다. */
const PEER_REPLY_DELAY_MS = 300;
/**
 * 백엔드는 접속 직후 편집자 정보를 읽다 실패하면(`student`가 없는 계정은 401 예외) 예외를 잡지 않아,
 * Spring이 `bootstrap`을 보내기 전에 1011(SERVER_ERROR)로 닫는다.
 */
const SERVER_ERROR_CLOSE_CODE = 1011;

/** 다른 사람에게서 받아 적용한 변경의 출처. 이 출처의 변경은 다시 보내지 않는다. */
const REMOTE_ORIGIN = Symbol("collaboration-remote");
/** 재접속 때 서버 상태로 갈아타며 내가 만든 변경, 편집 화면 밖에서 바뀐 본문을 받아들인 변경 */
const PROVIDER_ORIGIN = Symbol("collaboration-provider");

/**
 * - `connecting`: 처음 연결하는 중. 지금 편집 상태를 받기 전이라 본문을 고칠 수 없다
 * - `connected`: 연결했고 지금 편집 상태를 받았다
 * - `reconnecting`: 끊겨서 다시 연결하는 중. 고친 내용은 이 브라우저에 쌓였다가 연결되면 합쳐진다
 * - `failed`: 다시 시도해도 안 되는 이유로 멈췄다(`failure` 참고)
 */
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

/**
 * - `unauthorized`: 로그인이 풀려 핸드셰이크가 거절됐다
 * - `rejected`: `student`가 없는 계정이라 백엔드가 방에 들이지 않는다
 */
export type ConnectionFailure = "unauthorized" | "rejected";

export type CollaborationSnapshot = {
  status: ConnectionStatus;
  failure: ConnectionFailure | null;
  /**
   * 연결이 `bootstrap`까지 가지 못하고 연달아 실패해(`UNREACHABLE_AFTER_FAILURES`) 서버에 닿지 않는 것으로 본다.
   * 다시 시도는 계속하고, 연결되어 시작 상태를 받으면 풀린다. `failure`가 있으면 그쪽 안내가 우선이다
   */
  unreachable: boolean;
  /** 지금 편집 상태를 한 번이라도 받았다. 그 전에는 본문을 고칠 수 없다 */
  ready: boolean;
  /** 지금 본문. 처음 받기 전에는 화면을 그릴 때 받은 본문이다 */
  text: string;
  /** 지금 대표 이미지. 누가 바꾸면 `external-update`로 바로 바뀐다 */
  imageUrl: string | null;
  /** 이 방에서 마지막으로 저장된 결과. `revision`이 `null`이면 본문이 그대로라 리비전을 만들지 않았다 */
  lastSaved: { revision: number | null; byMe: boolean } | null;
  /** 편집 화면 밖에서 저장된 본문이 지금 편집 중인 본문과 다를 때 그 본문. 받아들일지는 사람이 정한다 */
  externalContent: string | null;
  /** 연결이 끊긴 동안 쓴 내용을 서버 상태와 합치지 못해 화면에서 빠진 내 본문 */
  unmergedDraft: string | null;
  /** 저장과 상관없는 서버의 `error` 메시지 */
  serverError: string | null;
  /** 연결이 끊긴 동안 고쳐 아직 서버에 보내지 못한 내용이 있다 */
  undelivered: boolean;
  /** 문서가 커서 버퍼 한도를 넘는 메시지를 보내지 못한 적이 있다 */
  oversized: boolean;
  /**
   * 접속자·커서 표시(#16)가 쓸 awareness. 연결을 시작할 때 만들고 멈출 때 없앤다. 로컬 상태의 `connection` 필드는
   * provider가 쓴다 — 접속할 때마다 바꿔, 다른 사람들이 그 신호를 보고 지금 문서 상태를 보내 주게 한다.
   */
  awareness: Awareness | null;
};

export type CollaborationSaveRequest = {
  content: string;
  summary?: string;
  minorEdit: boolean;
};

/**
 * - `disconnected`: 연결되어 있지 않아 보내지 않았다
 * - `too-large`: 버퍼 한도를 넘어 보내지 않았다
 * - `timeout` · `connection-lost`: 보냈지만 결과를 받지 못했다. 저장됐을 수도 있다
 * - `server-error`: 서버가 `error`로 답했다
 */
export type CollaborationSaveFailure =
  | "disconnected"
  | "too-large"
  | "timeout"
  | "connection-lost"
  | "server-error";

export type CollaborationSaveResult =
  | { ok: true; revision: number | null }
  | { ok: false; reason: CollaborationSaveFailure; message?: string };

export type CollaborationOptions = {
  articleId: number;
  /** 화면을 그릴 때 읽은 본문과 대표 이미지. 지금 편집 상태를 받기 전까지 보여 준다 */
  initialContent: string;
  initialImageUrl: string | null;
  /** 연결이 1011로 닫혔을 때 계정 문제(다시 해도 안 됨)인지 서버 장애인지 가르는 데만 쓴다 */
  studentAccount: boolean;
};

type SendResult = "sent" | "closed" | "too-large";

type PendingSave = {
  content: string;
  resolve: (result: CollaborationSaveResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * 문서 하나의 실시간 공동편집 연결. Yjs 문서를 들고 백엔드 방과 메시지를 주고받는다.
 *
 * 백엔드는 Yjs 바이트를 해석하지 않고 같은 방에 릴레이하거나 저장할 뿐이라, 늦게 들어온 사람이나 다시 연결한 사람이
 * 놓친 변경을 채우는 일도 클라이언트가 한다. 그 방법은 세 가지다.
 * - 접속하면 서버가 주는 `bootstrap`(마지막 `sync` 스냅샷이나 저장된 본문)으로 시작한다.
 * - 다시 연결했으면 서버 상태에 없는 내 변경(끊긴 동안 쓴 것)을 `update`로 보낸다.
 * - 접속할 때마다 awareness의 `connection`을 바꾼다. 이를 본 다른 사람들이 자기 문서 전체를 `update`로 보내,
 *   마지막 스냅샷 뒤에 오간 변경까지 받는다. 같은 변경을 여러 번 받아도 Yjs가 한 번만 반영한다.
 *
 * React와는 `subscribe` · `getSnapshot`(useSyncExternalStore)으로 잇는다. `start` · `stop`은 여러 번 오갈 수
 * 있어야 한다 — 개발 모드의 StrictMode가 effect를 두 번 실행하고, Yjs 문서는 그 사이에도 그대로 남는다.
 */
export class CollaborationProvider {
  readonly doc = new Y.Doc();
  readonly text: Y.Text;

  private readonly options: CollaborationOptions;
  private snapshot: CollaborationSnapshot;
  private readonly listeners = new Set<() => void>();

  private running = false;
  private socket: WebSocket | null = null;
  private socketOpened = false;
  private socketBootstrapped = false;
  private everBootstrapped = false;
  private connectStartedAt = 0;
  private stalledTicks = 0;
  private attempt = 0;
  /** `bootstrap`을 받기 전에 닫힌 연결이 이어진 횟수. 시작 상태를 받으면 0이 된다 */
  private failedAttempts = 0;
  private connectionSerial = 0;
  /** `bootstrap`보다 먼저 도착한 update. 서버가 방에 넣은 직후 `bootstrap`을 보내기 전에 남의 릴레이가 끼어들 수 있다 */
  private queuedBeforeBootstrap: Uint8Array[] = [];
  /** 한글 조합 중에는 원격 변경을 미룬다(`holdRemoteUpdates`) */
  private holds = 0;
  private heldRemote: (() => void)[] = [];

  /** 서버에 저장되어 있다고 아는 본문. `external-update`가 정말 바뀐 본문을 가져왔는지 가른다 */
  private lastKnownServerContent: string;
  /** 내가 마지막으로 `sync`나 `save`에 실어 보낸 본문 */
  private lastPushedContent: string | null = null;
  private pendingExternal: string | null = null;
  private pendingSave: PendingSave | null = null;
  private readonly peerConnections = new Map<number, unknown>();

  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private peerReplyTimer: ReturnType<typeof setTimeout> | null = null;
  private externalTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  /** 생성은 렌더링 중에 일어날 수 있어(useState 초기값) 연결 · 타이머 같은 부수 효과는 `start`에서 한다 */
  constructor(options: CollaborationOptions) {
    this.options = options;
    this.text = this.doc.getText(TEXT_NAME);
    const initialText = normalizeLineBreaks(options.initialContent);
    this.lastKnownServerContent = initialText;
    this.snapshot = {
      status: "connecting",
      failure: null,
      unreachable: false,
      ready: false,
      text: initialText,
      imageUrl: options.initialImageUrl,
      lastSaved: null,
      externalContent: null,
      unmergedDraft: null,
      serverError: null,
      undelivered: false,
      oversized: false,
      awareness: null,
    };

    this.doc.on("update", this.handleDocUpdate);
    this.text.observe(() => {
      // 처음 받은 상태를 적용하는 중에는 아직 화면을 그릴 때의 본문을 보여 준다. 다 적용한 뒤 한 번에 바꾼다.
      if (!this.everBootstrapped) return;
      const text = this.text.toString();
      // 밖에서 바뀐 본문을 다른 사람이 먼저 받아들였으면 더 물을 것이 없다.
      const settled = this.snapshot.externalContent === text;
      this.update(settled ? { text, externalContent: null } : { text });
    });
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  start() {
    if (this.running) return;
    this.running = true;

    const awareness = new Awareness(this.doc);
    awareness.on("update", this.handleAwarenessUpdate);
    this.update({ awareness });

    window.addEventListener("online", this.reconnectNow);
    window.addEventListener("offline", this.dropSocket);
    window.addEventListener("pagehide", this.handlePageHide);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.watchdog = setInterval(this.checkConnection, WATCHDOG_INTERVAL_MS);

    this.connect();
  }

  stop() {
    if (!this.running) return;
    this.running = false;

    window.removeEventListener("online", this.reconnectNow);
    window.removeEventListener("offline", this.dropSocket);
    window.removeEventListener("pagehide", this.handlePageHide);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
    this.clearTimer("retryTimer");
    this.clearTimer("externalTimer");
    this.pendingExternal = null;

    // 떠나기 전에 마지막 상태를 남긴다. 방이 비면 백엔드가 이 스냅샷의 본문으로 자동 저장한다.
    const awareness = this.snapshot.awareness;
    if (this.socketBootstrapped) {
      this.flushSync();
      awareness?.setLocalState(null);
    }
    const socket = this.socket;
    this.detachSocket();
    socket?.close(1000);
    this.settleSave({ ok: false, reason: "connection-lost" });

    // 미뤄 둔 원격 변경은 버리지 않고 적용해 둔다. 다시 시작하면 이 문서에서 이어 간다.
    this.holds = 0;
    this.runHeldRemote();

    awareness?.off("update", this.handleAwarenessUpdate);
    awareness?.destroy();
    this.update({
      awareness: null,
      status: this.everBootstrapped ? "reconnecting" : "connecting",
    });
  }

  /**
   * 원격 변경을 잠시 미룬다. 돌려준 함수를 부르면 미룬 변경을 차례로 적용한다.
   *
   * 한글처럼 조합해서 입력하는 동안 textarea의 값을 바꾸면 조합이 깨진다. 그렇다고 문서에만 원격 변경을 넣고
   * 화면을 미루면 화면과 문서의 위치가 어긋나 내 입력이 엉뚱한 곳에 들어간다. Yjs의 변경은 늦게 적용해도
   * 결과가 같으므로 조합이 끝날 때까지 문서에 넣는 것 자체를 미룬다.
   */
  holdRemoteUpdates(): () => void {
    this.holds++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds = Math.max(0, this.holds - 1);
      if (this.holds === 0) this.runHeldRemote();
    };
  }

  /**
   * 본문을 `next`로 바꾸는 최소 변경을 문서에 넣는다. `cursor`는 입력 직후의 커서 위치로, 같은 글자가 이어진 곳에서
   * 어디를 고쳤는지 가르는 데 쓴다. `origin`은 이 변경을 화면에 이미 반영한 쪽이 자기 변경을 알아보는 표식이다.
   */
  replaceText(next: string, cursor: number, origin: unknown) {
    const change = diffText(this.text.toString(), next, cursor);
    if (!change) return;
    this.doc.transact(() => {
      if (change.removed > 0) this.text.delete(change.index, change.removed);
      if (change.inserted) this.text.insert(change.index, change.inserted);
    }, origin);
  }

  /**
   * 지금 본문을 새 리비전으로 저장한다. 실패해도 던지지 않고 결과로 알린다.
   * 백엔드의 저장 응답(`saved`)은 방 전체에 가고 누구의 저장인지 담지 않아, 내가 보낸 뒤 처음 오는 `saved`를 내 것으로 본다.
   */
  save = (
    request: CollaborationSaveRequest,
  ): Promise<CollaborationSaveResult> => {
    if (this.pendingSave || !this.socketBootstrapped) {
      return Promise.resolve({ ok: false, reason: "disconnected" });
    }
    const sent = this.send(
      {
        type: "save",
        content: request.content,
        summary: request.summary,
        minorEdit: request.minorEdit,
        reason: "manual",
      },
      { countAsOversized: false },
    );
    if (sent !== "sent") {
      return Promise.resolve({
        ok: false,
        reason: sent === "too-large" ? "too-large" : "disconnected",
      });
    }
    return new Promise((resolve) => {
      this.pendingSave = {
        content: request.content,
        resolve,
        timer: setTimeout(
          () => this.settleSave({ ok: false, reason: "timeout" }),
          SAVE_TIMEOUT_MS,
        ),
      };
    });
  };

  /** 편집 화면 밖에서 저장된 본문으로 바꾼다. 내 변경으로 넣어 다른 사람들에게도 간다. */
  acceptExternalContent = () => {
    const content = this.snapshot.externalContent;
    if (content === null) return;
    this.replaceText(content, content.length, PROVIDER_ORIGIN);
    this.update({ externalContent: null });
  };

  dismissExternalContent = () => this.update({ externalContent: null });

  dismissUnmergedDraft = () => this.update({ unmergedDraft: null });

  private update(partial: Partial<CollaborationSnapshot>) {
    this.snapshot = { ...this.snapshot, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  // ── 연결 ─────────────────────────────────────────────

  private connect() {
    this.clearTimer("retryTimer");
    const socket = openCollaborationSocket(this.options.articleId);
    this.socket = socket;
    this.socketOpened = false;
    this.socketBootstrapped = false;
    this.queuedBeforeBootstrap = [];
    this.connectStartedAt = Date.now();
    this.stalledTicks = 0;

    socket.onopen = () => {
      if (this.socket === socket) this.socketOpened = true;
    };
    socket.onmessage = (event) => {
      if (this.socket === socket && typeof event.data === "string") {
        this.handleMessage(event.data, socket);
      }
    };
    socket.onclose = (event) => {
      if (this.socket === socket) this.handleClose(event.code);
    };

    this.update({
      status: this.everBootstrapped ? "reconnecting" : "connecting",
      failure: null,
    });
  }

  private handleClose(code: number) {
    const opened = this.socketOpened;
    const bootstrapped = this.socketBootstrapped;
    this.detachSocket();
    this.settleSave({ ok: false, reason: "connection-lost" });
    if (!this.running) return;

    // 시작 상태를 받은 뒤의 끊김은 실패가 아니다. 그 뒤로 다시 연결하지 못한 시도부터 센다.
    if (!bootstrapped) this.failedAttempts++;
    this.update({
      status: this.everBootstrapped ? "reconnecting" : "connecting",
    });
    if (!opened) {
      // 핸드셰이크 실패. 네트워크 문제인지 로그인이 풀린 것(401)인지 브라우저가 알려 주지 않아 세션을 직접 확인한다.
      void this.retryUnlessSignedOut();
      return;
    }
    if (
      !bootstrapped &&
      code === SERVER_ERROR_CLOSE_CODE &&
      !this.options.studentAccount
    ) {
      this.update({ status: "failed", failure: "rejected" });
      return;
    }
    this.scheduleReconnect();
  }

  private async retryUnlessSignedOut() {
    let signedIn = true;
    try {
      signedIn = (await fetchSession()) !== null;
    } catch {
      // 세션도 확인하지 못하면 네트워크 문제로 보고 계속 시도한다.
    }
    // 확인하는 사이에 멈췄거나(화면을 떠남) 다른 계기(온라인 복귀)로 이미 다시 연결했으면 그쪽에 맡긴다.
    if (!this.running || this.socket) return;
    if (!signedIn) {
      this.update({ status: "failed", failure: "unauthorized" });
      return;
    }
    this.scheduleReconnect();
  }

  /**
   * 지수 백오프(1초부터 두 배씩, 최대 30초). 여러 사람이 한꺼번에 다시 붙지 않게 ±20%를 흔든다.
   *
   * 서버에 닿지 않는다는 안내도 여기서 켠다. 로그인이 풀렸는지 · 들일 수 없는 계정인지 가른 뒤에만 이리 오므로,
   * 그 안내가 뜰 자리에 잠깐 이 안내가 먼저 비치지 않는다.
   */
  private scheduleReconnect() {
    if (
      this.failedAttempts >= UNREACHABLE_AFTER_FAILURES &&
      !this.snapshot.unreachable
    ) {
      this.update({ unreachable: true });
    }
    this.clearTimer("retryTimer");
    const base = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** this.attempt,
    );
    this.attempt++;
    this.retryTimer = setTimeout(
      () => {
        this.retryTimer = null;
        if (this.running && !this.socket) this.connect();
      },
      base * (0.8 + Math.random() * 0.4),
    );
  }

  /** 네트워크가 돌아오거나 탭이 다시 보이면 백오프를 기다리지 않는다. 멈춘(`failed`) 상태는 그대로 둔다. */
  private reconnectNow = () => {
    if (!this.running || this.socket || this.snapshot.status === "failed")
      return;
    this.connect();
  };

  private handleVisibility = () => {
    if (document.visibilityState === "visible") this.reconnectNow();
  };

  /** 끊긴 것을 브라우저보다 먼저 알아챈 경우 소켓을 버리고 닫힌 것으로 처리한다. */
  private dropSocket = () => {
    const socket = this.socket;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.close();
    this.handleClose(0);
  };

  private checkConnection = () => {
    const socket = this.socket;
    if (!socket) return;
    if (socket.readyState === WebSocket.CONNECTING) {
      if (Date.now() - this.connectStartedAt > CONNECT_TIMEOUT_MS)
        this.dropSocket();
      return;
    }
    if (socket.readyState !== WebSocket.OPEN || socket.bufferedAmount === 0) {
      this.stalledTicks = 0;
      return;
    }
    this.stalledTicks++;
    if (this.stalledTicks >= STALLED_TICKS_LIMIT) this.dropSocket();
  };

  /** 소켓과 그 연결에 딸린 상태를 정리한다. 다른 사람의 접속 여부는 다시 연결해야 알 수 있어 awareness에서 지운다. */
  private detachSocket() {
    this.socket = null;
    this.socketOpened = false;
    this.socketBootstrapped = false;
    this.queuedBeforeBootstrap = [];
    this.clearTimer("syncTimer");
    this.clearTimer("peerReplyTimer");
    const awareness = this.snapshot.awareness;
    if (awareness) {
      const remote = [...awareness.getStates().keys()].filter(
        (clientId) => clientId !== this.doc.clientID,
      );
      if (remote.length > 0)
        removeAwarenessStates(awareness, remote, REMOTE_ORIGIN);
    }
    this.peerConnections.clear();
  }

  private send(
    message: CollaborationMessage,
    { countAsOversized = true }: { countAsOversized?: boolean } = {},
  ): SendResult {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return "closed";
    const json = JSON.stringify(message);
    // 글자 수의 세 배가 한도 안이면 UTF-8로 세어 볼 것도 없다. 대부분의 update가 여기서 끝난다.
    if (
      json.length * 3 > MAX_MESSAGE_BYTES &&
      new TextEncoder().encode(json).length > MAX_MESSAGE_BYTES
    ) {
      if (countAsOversized && !this.snapshot.oversized)
        this.update({ oversized: true });
      return "too-large";
    }
    socket.send(json);
    return "sent";
  }

  // ── 받은 메시지 ─────────────────────────────────────────

  private handleMessage(raw: string, socket: WebSocket) {
    let message: CollaborationMessage;
    try {
      message = JSON.parse(raw) as CollaborationMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case "bootstrap":
        // 한글 조합 때문에 미룬 사이 그 연결이 끊겼으면 버린다. 적용하면 연결이 없는데도 '연결됨'이 되고, 새 연결이
        // 이미 붙어 있으면 그 연결의 시작 상태보다 먼저 낡은 상태가 들어간다. 늦게 온 `update`는 CRDT라 그대로 둔다.
        this.runRemote(() => {
          if (this.socket === socket) this.applyBootstrap(message);
        });
        break;
      case "update": {
        const update = decode(message.dataB64);
        if (!update) break;
        if (!this.socketBootstrapped) this.queuedBeforeBootstrap.push(update);
        else this.runRemote(() => this.applyRemoteUpdate(update));
        break;
      }
      case "awareness": {
        const update = decode(message.dataB64);
        const awareness = this.snapshot.awareness;
        if (update && awareness) {
          try {
            applyAwarenessUpdate(awareness, update, REMOTE_ORIGIN);
          } catch {
            // 깨진 awareness는 접속자 표시만 틀리게 할 뿐이라 버린다.
          }
        }
        break;
      }
      case "saved":
        this.handleSaved(message.revision ?? null);
        break;
      case "external-update":
        this.handleExternalUpdate(message);
        break;
      case "error":
        if (this.pendingSave) {
          this.settleSave({
            ok: false,
            reason: "server-error",
            message: message.message ?? undefined,
          });
        } else {
          this.update({ serverError: message.message ?? "알 수 없는 오류" });
        }
        break;
    }
  }

  private applyRemoteUpdate(update: Uint8Array) {
    try {
      Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
    } catch {
      // 해석할 수 없는 바이트는 문서를 바꾸지 못하고 버려진다. 연결은 그대로 둔다.
    }
  }

  /**
   * 접속 직후의 시작 상태를 적용한다. 진행 중 상태(`dataB64`)가 있으면 그것을, 없으면 저장된 본문(`content`)을
   * 결정적인 update로 만들어(`createSeedUpdate`) 넣는다.
   *
   * 다시 연결한 경우에는 이 브라우저의 문서에 이미 내용이 있다. 서버 상태와 같은 뿌리(같은 시작 update에서 이어진
   * 문서)면 그냥 합치면 끊긴 동안의 내 편집도 살아남는다. 뿌리가 다르면(방이 비어 백엔드가 자동 저장하고 상태를
   * 지운 뒤 누군가 새로 시작한 경우) 합치면 본문이 두 번 들어가므로 서버 상태로 갈아탄다.
   */
  private applyBootstrap(message: CollaborationMessage) {
    let incoming: Uint8Array | null;
    let content: string | null = null;
    if (typeof message.dataB64 === "string") {
      incoming = decode(message.dataB64);
    } else {
      content = normalizeLineBreaks(message.content ?? "");
      incoming = createSeedUpdate(content);
    }
    if (!incoming) {
      // 시작 상태를 읽을 수 없으면 이 연결로는 편집할 수 없다. 다시 연결해 새 상태를 받는다.
      this.dropSocket();
      return;
    }

    const reconnecting = this.everBootstrapped;
    if (!reconnecting || sharesOrigin(this.doc, incoming)) {
      this.applyRemoteUpdate(incoming);
    } else {
      this.switchToServerState(incoming, content);
    }

    if (content !== null) {
      this.lastKnownServerContent = content;
      this.update({ imageUrl: message.imageUrl ?? null });
    }
    this.socketBootstrapped = true;
    this.everBootstrapped = true;
    this.attempt = 0;
    this.failedAttempts = 0;
    const queued = this.queuedBeforeBootstrap;
    this.queuedBeforeBootstrap = [];
    queued.forEach((update) => this.applyRemoteUpdate(update));

    let delivered = true;
    if (reconnecting) {
      // 서버 상태에 없는 것(끊긴 동안의 내 편집, 갈아타며 지운 글자)만 골라 보낸다.
      const missing = Y.encodeStateAsUpdate(
        this.doc,
        Y.encodeStateVectorFromUpdate(incoming),
      );
      delivered =
        this.send({ type: "update", dataB64: bytesToBase64(missing) }) ===
        "sent";
    }
    this.update({
      status: "connected",
      failure: null,
      unreachable: false,
      ready: true,
      text: this.text.toString(),
      undelivered: this.snapshot.undelivered && !delivered,
      serverError: null,
    });

    // 접속을 알린다. 이 값이 바뀐 것을 본 사람들이 자기 문서 전체를 보내 준다.
    this.connectionSerial++;
    this.snapshot.awareness?.setLocalStateField(
      "connection",
      `${Date.now().toString(36)}-${this.connectionSerial}`,
    );
    // 처음 채운 상태를 곧바로 서버에 남겨, 뒤이어 들어오는 사람이 같은 시작 상태를 받게 한다.
    this.flushSync();
  }

  /**
   * 뿌리가 다른 서버 상태로 갈아탄다. 내 문서의 글자를 모두 지운 뒤 서버 상태를 합친다 — 지운 표시는 다른 사람에게도
   * 가므로, 옛 뿌리를 아직 가진 사람이 있어도 모두 서버 상태로 모인다.
   *
   * 끊긴 동안 쓴 내 편집은 아래 경우에만 다시 얹는다. 서버가 준 본문이 내가 마지막으로 올린 본문과 같다면, 그사이
   * 서버에 들어간 남의 변경이 없으므로 내 본문이 최신이다(혼자 편집하다 오래 끊긴 경우). 그 밖에는 남의 편집을 덮지
   * 않도록 서버 상태를 따르고, 화면에서 빠진 내 본문은 복사할 수 있게 남긴다.
   */
  private switchToServerState(incoming: Uint8Array, content: string | null) {
    const mine = this.text.toString();
    // 아래에서 글자를 지우는 것도 아직 보내지 못한 변경으로 잡히므로, 끊긴 동안 쓴 것이 있었는지는 먼저 읽어 둔다.
    const hadUndelivered = this.snapshot.undelivered;
    const keepMine = content !== null && content === this.lastPushedContent;
    this.doc.transact(
      () => this.text.delete(0, this.text.length),
      PROVIDER_ORIGIN,
    );
    this.applyRemoteUpdate(incoming);
    if (keepMine) {
      this.replaceText(mine, mine.length, PROVIDER_ORIGIN);
    } else if (hadUndelivered && mine !== this.text.toString()) {
      this.update({ unmergedDraft: mine });
    }
  }

  private handleSaved(revision: number | null) {
    // 방 안의 저장이 보낸 `external-update`였다. 그 본문이 이제 서버의 본문이다.
    if (this.pendingExternal !== null) {
      this.lastKnownServerContent = this.pendingExternal;
      this.pendingExternal = null;
      this.clearTimer("externalTimer");
    }
    const byMe = this.pendingSave !== null;
    if (this.pendingSave) {
      this.lastPushedContent = this.pendingSave.content;
      this.settleSave({ ok: true, revision });
    }
    // 방의 본문이 다시 저장되었으므로, 그 전에 밖에서 바뀐 본문을 받아들일지 묻던 안내는 의미가 없다.
    this.update({
      lastSaved: { revision, byMe },
      serverError: null,
      externalContent: null,
    });
  }

  /**
   * 대표 이미지는 CRDT로 합치지 않고 마지막 값을 그대로 쓴다. 본문은 자동으로 바꾸지 않는다.
   *
   * 이 메시지는 방 안의 저장(`save`)과 대표 이미지 교체 뒤에도 온다. 그 본문은 서버에 저장된 본문일 뿐 지금 편집
   * 중인 본문보다 오래되었을 수 있어, 그대로 넣으면 그사이의 편집이 되돌아간다. 또 방의 모두가 같은 메시지를 받아
   * 각자 넣으면 글자가 사람 수만큼 들어간다. 그래서 정말 밖에서 바뀐 본문만 골라 받아들일지 사람에게 묻는다.
   */
  private handleExternalUpdate(message: CollaborationMessage) {
    this.update({ imageUrl: message.imageUrl ?? null });
    if (typeof message.content !== "string") return;
    const content = normalizeLineBreaks(message.content);
    if (content === this.lastKnownServerContent) return;

    this.clearTimer("externalTimer");
    this.pendingExternal = content;
    this.externalTimer = setTimeout(() => {
      this.externalTimer = null;
      const external = this.pendingExternal;
      this.pendingExternal = null;
      if (external === null) return;
      this.lastKnownServerContent = external;
      if (external !== this.text.toString())
        this.update({ externalContent: external });
    }, EXTERNAL_SETTLE_MS);
  }

  private settleSave(result: CollaborationSaveResult) {
    const pending = this.pendingSave;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingSave = null;
    pending.resolve(result);
  }

  private runRemote(apply: () => void) {
    if (this.holds > 0) this.heldRemote.push(apply);
    else apply();
  }

  private runHeldRemote() {
    const held = this.heldRemote;
    this.heldRemote = [];
    held.forEach((apply) => apply());
  }

  // ── 보내는 메시지 ───────────────────────────────────────

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== REMOTE_ORIGIN) {
      const sent =
        this.socketBootstrapped &&
        this.send({ type: "update", dataB64: bytesToBase64(update) }) ===
          "sent";
      // 보내지 못한 변경은 다시 연결할 때 서버 상태에 없는 것으로 골라져 한꺼번에 간다.
      if (!sent && !this.snapshot.undelivered)
        this.update({ undelivered: true });
    }
    this.scheduleSync();
  };

  private scheduleSync() {
    if (!this.socketBootstrapped || this.syncTimer) return;
    this.syncTimer = setTimeout(this.flushSync, SYNC_DELAY_MS);
  }

  /** 문서 전체 스냅샷과 그 본문을 보낸다. 백엔드는 릴레이하지 않고 Redis에 덮어쓴다. */
  private flushSync = () => {
    this.clearTimer("syncTimer");
    if (!this.socketBootstrapped) return;
    const content = this.text.toString();
    const sent = this.send({
      type: "sync",
      dataB64: bytesToBase64(Y.encodeStateAsUpdate(this.doc)),
      content,
    });
    if (sent === "sent") this.lastPushedContent = content;
  };

  /**
   * 탭을 닫거나 다른 사이트로 떠날 때. 화면이 정리될 틈이 없어 `stop`이 불리지 않으므로 여기서 마지막 상태를 남기고,
   * 다른 사람 화면에서 내 커서와 아바타가 곧바로 사라지도록 떠난다고 알린다. 알리지 않으면 awareness의 타임아웃(30초)이
   * 지나야 사라진다 — 백엔드는 awareness를 해석하지 않아 접속이 끊겨도 대신 알려 주지 않는다.
   *
   * 로컬 상태는 지우지 않고 지운 상태만 보낸다(같은 시계의 빈 상태는 받는 쪽에서 삭제로 처리된다). 뒤로 가기 캐시로
   * 페이지가 돌아와도 로컬 상태가 남아 있어야 다음 갱신이나 재접속 신호(`connection`)를 실을 수 있다.
   */
  private handlePageHide = () => {
    this.flushSync();
    const awareness = this.snapshot.awareness;
    if (!awareness || !this.socketBootstrapped) return;
    this.send({
      type: "awareness",
      dataB64: bytesToBase64(
        encodeAwarenessUpdate(awareness, [this.doc.clientID], new Map()),
      ),
    });
  };

  private handleAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    removed.forEach((clientId) => this.peerConnections.delete(clientId));
    const awareness = this.snapshot.awareness;
    if (!awareness) return;

    if (origin === REMOTE_ORIGIN) {
      // 처음 보는 접속(새로 들어왔거나 다시 연결한 사람)이 있으면 내 문서 전체를 보내 준다.
      const states = awareness.getStates();
      let newConnection = false;
      for (const clientId of [...added, ...updated]) {
        const connection = (
          states.get(clientId) as { connection?: unknown } | undefined
        )?.connection;
        if (
          connection === undefined ||
          this.peerConnections.get(clientId) === connection
        ) {
          continue;
        }
        this.peerConnections.set(clientId, connection);
        newConnection = true;
      }
      if (newConnection) this.schedulePeerReply();
      return;
    }

    if ([...added, ...updated, ...removed].includes(this.doc.clientID)) {
      this.sendAwareness();
    }
  };

  private sendAwareness() {
    const awareness = this.snapshot.awareness;
    if (!awareness) return;
    this.send({
      type: "awareness",
      dataB64: bytesToBase64(
        encodeAwarenessUpdate(awareness, [this.doc.clientID]),
      ),
    });
  }

  private schedulePeerReply() {
    if (this.peerReplyTimer) return;
    this.peerReplyTimer = setTimeout(() => {
      this.peerReplyTimer = null;
      // 아직 시작 상태를 받기 전이면 보낼 것이 없다. 내 접속 알림이 나가면 그쪽에서 나를 알게 된다.
      if (!this.socketBootstrapped) return;
      this.send({
        type: "update",
        dataB64: bytesToBase64(Y.encodeStateAsUpdate(this.doc)),
      });
      this.sendAwareness();
    }, PEER_REPLY_DELAY_MS);
  }

  private clearTimer(
    name: "retryTimer" | "syncTimer" | "peerReplyTimer" | "externalTimer",
  ) {
    const timer = this[name];
    if (timer) clearTimeout(timer);
    this[name] = null;
  }
}

function decode(base64: string | null | undefined): Uint8Array | null {
  if (typeof base64 !== "string") return null;
  try {
    return base64ToBytes(base64);
  } catch {
    return null;
  }
}

/**
 * 두 상태가 같은 시작 update에서 이어졌는지. 같은 뿌리의 문서는 시작 update를 만든 clientID를 함께 가지므로,
 * 상태 벡터에 겹치는 clientID가 하나라도 있으면 같은 뿌리로 본다. 한쪽이 비었으면 합쳐도 겹칠 글자가 없다.
 */
function sharesOrigin(doc: Y.Doc, incoming: Uint8Array): boolean {
  const ours = Y.decodeStateVector(Y.encodeStateVector(doc));
  let theirs: Map<number, number>;
  try {
    theirs = Y.decodeStateVector(Y.encodeStateVectorFromUpdate(incoming));
  } catch {
    return true;
  }
  if (ours.size === 0 || theirs.size === 0) return true;
  for (const clientId of theirs.keys()) {
    if (ours.has(clientId)) return true;
  }
  return false;
}
