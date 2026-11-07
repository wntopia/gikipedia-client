"use client";

import { useEffect, type RefObject } from "react";

/**
 * 화면 어디서든 `/`를 누르면 검색창으로 옮겨 간다.
 *
 * 다른 입력칸에서 `/`를 타이핑하는 중이면 가로채지 않는다. Ctrl·Alt·Cmd와 함께 누른 것은 브라우저·OS
 * 단축키 몫이라 넘긴다. Shift는 거르지 않는다 — `key`가 이미 눌린 글자라 Shift+/(`?`)는 여기 오지 않고,
 * Shift를 눌러야 `/`가 나오는 자판도 있기 때문이다.
 */
export function useSlashShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.defaultPrevented) return;
      // 한글 조합 중에는 조합을 끝내는 키 입력이 함께 온다. 조합 중인 입력은 건드리지 않는다.
      if (event.isComposing) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const input = inputRef.current;
      // 좁은 화면에서 숨긴 검색창(문서 상단 바)은 포커스를 받지 못한다. 그때 가로채면 `/`만 먹힌다.
      if (!input || !input.checkVisibility()) return;
      // 막지 않으면 포커스가 옮겨 간 검색창에 `/`가 그대로 입력된다.
      event.preventDefault();
      input.focus();
      input.select();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inputRef, enabled]);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
