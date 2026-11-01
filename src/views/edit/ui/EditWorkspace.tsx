"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SigninButton } from "@/features/auth";
import {
  CollaborationNotices,
  CollaborationStatus,
  describeConnectionProblem,
  groupParticipants,
  PresenceAvatars,
  PresenceCursors,
  useCollaboration,
  useCollaborativeText,
  usePresence,
  type PresenceUser,
} from "@/features/collaboration";
import {
  ArticleImagePicker,
  findAccountProblem,
  useLeaveGuard,
  usePickedImage,
  useSaveArticle,
  type SaveTarget,
} from "@/features/save-article";
import { Alert } from "@/shared/ui";
import { DocumentEditor } from "@/widgets/document-editor";
import { EditGuide } from "@/widgets/edit-guide";
import { EditorTopBar } from "@/widgets/editor-top-bar";

type EditWorkspaceProps = {
  /** 새 문서를 만드는지, 어느 문서를 고치는지 */
  target: SaveTarget;
  /** 새 문서는 주소로 받은 제목(없으면 빈 문자열), 기존 문서는 고칠 수 없는 지금 제목 */
  initialTitle: string;
  /** 편집을 시작할 때의 본문. 새 문서는 빈 문자열이다. */
  initialContent: string;
  /** 지금 저장된 대표 이미지 주소. 새 문서이거나 이미지가 없으면 `null` */
  imageUrl: string | null;
  /** 편집을 그만두면 돌아갈 곳과, 그곳을 가리키는 이름 */
  backHref: string;
  backLabel: string;
  /** 저장이 로그인 만료로 실패해 다시 로그인했을 때 돌아올 주소 */
  returnTo: string;
  /** 공동편집에서 다른 사람에게 보일 나. 공동편집을 쓰지 않는 새 문서에는 주지 않는다 */
  presenceUser?: PresenceUser;
};

/**
 * 편집 화면의 본체. 기존 문서 편집과 새 문서 작성이 함께 쓴다.
 * 저장 버튼(상단 바), 입력 칸(편집기), 대표 이미지(사이드바)가 서로 다른 위젯이라
 * 세 위젯의 공통 조상인 이 화면이 입력 값을 모두 갖고, 저장 동작은 `features/save-article`에 맡긴다.
 *
 * 기존 문서는 본문을 실시간 공동편집 문서(`features/collaboration`)에 두고, 저장도 그 연결로 한다. 두 기능은 같은
 * 레이어라 서로 모르므로 이 화면이 공동편집의 `save`를 저장 동작에 넘겨 잇는다.
 *
 * 본문은 textarea 밖(이 화면의 상태나 공동편집 문서)에 둔다. 미리보기로 전환하면 textarea가 언마운트되는데,
 * 본문을 textarea 안에만 두면 그때 입력한 내용이 사라지기 때문이다.
 */
export function EditWorkspace({
  target,
  initialTitle,
  initialContent,
  imageUrl,
  backHref,
  backLabel,
  returnTo,
  presenceUser,
}: EditWorkspaceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState("");
  const [minorEdit, setMinorEdit] = useState(false);
  const [image, pickImage] = usePickedImage();

  const alertRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const { provider, snapshot } = useCollaboration(
    target.kind === "update"
      ? {
          articleId: target.articleId,
          initialContent,
          initialImageUrl: imageUrl,
          studentAccount: target.studentAccount,
        }
      : null,
  );
  const {
    content,
    readOnly: contentReadOnly,
    ref: contentInputRef,
    onChange: onContentChange,
    onCompositionStart,
    onCompositionEnd,
  } = useCollaborativeText(provider, snapshot, initialContent, contentRef);
  const { status, problem, save } = useSaveArticle(target, provider?.save);
  // 화면이 서버에서 다시 그려지면 같은 사람이어도 새 객체가 온다. 그때마다 방에 다시 알리지 않게 값으로 고정한다.
  const presenceKey = presenceUser?.key ?? null;
  const presenceName = presenceUser?.name ?? null;
  const me = useMemo(
    () =>
      presenceName === null ? null : { key: presenceKey, name: presenceName },
    [presenceKey, presenceName],
  );
  const peers = usePresence(snapshot, me);

  const collaborative = provider !== null;
  const changed = collaborative
    ? // 연결된 동안의 편집은 바로 다른 사람과 서버에 가고, 방이 비면 백엔드가 자동으로 저장한다. 떠나서 잃는 것은
      // 끊긴 동안 쓴 내용(아직 못 보냈거나, 합치지 못해 화면에서 빠진 것)과 아직 저장하지 않은 이미지 · 편집 요약뿐이다.
      snapshot.undelivered ||
      snapshot.unmergedDraft !== null ||
      image !== null ||
      summary !== "" ||
      minorEdit
    : title !== initialTitle || content !== initialContent || image !== null;
  // 저장에 성공해 문서로 넘어가는 중에는 묻지 않는다.
  const confirmLeave = useLeaveGuard(changed && status !== "saved");

  // 저장이 막히면 고칠 칸으로 포커스를 옮기고, 칸과 상관없는 실패는 안내가 화면에 들어오게 스크롤한다.
  // 미리보기 중이라 본문 칸이 없으면 옮기지 않는다 — 안내는 그대로 보인다.
  useEffect(() => {
    if (!problem) return;
    const field =
      problem.field === "title"
        ? titleRef.current
        : problem.field === "content"
          ? contentRef.current
          : null;
    if (field) field.focus();
    else alertRef.current?.scrollIntoView({ block: "nearest" });
  }, [problem]);

  async function handleSave() {
    const outcome = await save({
      title,
      content,
      image: image?.file ?? null,
      summary,
      minorEdit,
    });
    // 올린 이미지는 이제 문서의 지금 이미지다. 편집 요약과 가벼운 수정은 방금 저장한 리비전의 것이라 비운다.
    if (outcome.imageSaved) pickImage(null);
    if (outcome.saved && collaborative) {
      setSummary("");
      setMinorEdit(false);
    }
  }

  const locked = status !== "idle";
  // 저장 실패 안내가 없으면, 다시 연결해도 풀리지 않는 연결 실패나 저장하기 전부터 거절될 것을 아는 계정을 알린다.
  // 같은 자리에 하나만 보인다.
  const notice =
    problem ??
    (collaborative ? describeConnectionProblem(snapshot) : null) ??
    findAccountProblem(target);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <EditorTopBar
        backHref={backHref}
        backLabel={backLabel}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview((prev) => !prev)}
        onSave={handleSave}
        saving={locked}
        // 본문 저장은 공동편집 연결로만 하므로 연결되어 있지 않으면 누를 수 없다. 쓰던 내용은 그대로 남는다.
        saveBlockedReason={
          collaborative && snapshot.status !== "connected"
            ? "공동편집 서버에 연결되면 저장할 수 있습니다"
            : undefined
        }
        status={collaborative && <CollaborationStatus snapshot={snapshot} />}
        participants={
          collaborative && (
            <PresenceAvatars participants={groupParticipants(peers)} />
          )
        }
        onLeave={confirmLeave}
      />

      <div className="mx-auto max-w-[1120px] px-4 pb-[100px] pt-6 sm:px-8 sm:pt-8">
        {notice && (
          // 고정된 상단 바(58px)에 가리지 않을 만큼 띄워서 스크롤한다.
          <div ref={alertRef} className="mb-5 scroll-mt-[74px]">
            <Alert title={notice.title} detail={notice.detail}>
              {notice.message}
              {notice.needsSignin && (
                // 전역 `a { color: inherit; text-decoration: none }`이 레이어 밖에 있어 링크에 준 색·밑줄
                // 유틸리티를 덮는다. 그래서 버튼 모양 대신 안내 글자색을 물려받고, 밑줄은 안쪽 span에 건다.
                <div className="mt-1.5">
                  <SigninButton returnTo={returnTo} className="font-bold">
                    <span className="underline underline-offset-2">
                      다시 로그인
                    </span>
                  </SigninButton>
                </div>
              )}
            </Alert>
          </div>
        )}
        {provider && (
          <CollaborationNotices provider={provider} snapshot={snapshot} />
        )}

        <DocumentEditor
          title={title}
          // 기존 문서의 제목은 백엔드가 수정 요청에서 받지 않아 고칠 수 없게 둔다.
          onTitleChange={target.kind === "create" ? setTitle : undefined}
          content={content}
          onContentChange={onContentChange}
          onContentCompositionStart={onCompositionStart}
          onContentCompositionEnd={onCompositionEnd}
          // 공동편집은 저장 중에도 본문을 잠그지 않는다. 다른 사람도 계속 고치고, 저장은 보낸 순간의 본문을 담는다.
          contentReadOnly={collaborative ? contentReadOnly : undefined}
          showPreview={showPreview}
          // 편집 요약·가벼운 수정은 기존 문서의 저장에만 있는 필드라 새 문서에서는 숨긴다.
          revisionNote={
            target.kind === "update"
              ? {
                  summary,
                  minorEdit,
                  onSummaryChange: setSummary,
                  onMinorEditChange: setMinorEdit,
                }
              : undefined
          }
          locked={locked}
          titleRef={titleRef}
          contentRef={contentInputRef}
          contentOverlay={
            provider && (
              <PresenceCursors
                provider={provider}
                awareness={snapshot.awareness}
                ready={snapshot.ready}
                peers={peers}
                text={content}
                textareaRef={contentRef}
              />
            )
          }
          aside={
            <>
              <div className="mb-4">
                <ArticleImagePicker
                  currentUrl={collaborative ? snapshot.imageUrl : imageUrl}
                  picked={image}
                  onPick={pickImage}
                  disabled={locked}
                />
              </div>
              <EditGuide />
            </>
          }
        />
      </div>
    </div>
  );
}
