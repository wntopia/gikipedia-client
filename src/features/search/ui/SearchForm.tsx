"use client";

import Form from "next/form";
import { useRef, type FormEvent } from "react";
import { SEARCH_QUERY_MAX_LENGTH } from "@/entities/document";
import { ROUTES, SEARCH_QUERY_PARAM } from "@/shared/config";
import { useSlashShortcut } from "../model/slash-shortcut";

/**
 * compact: 헤더·문서 상단 내비의 작은 상자. 시안에서 `/` 단축키 표시가 있는 곳이라 단축키도 이 모양만 받는다.
 *          홈처럼 히어로와 함께 있어도 고정된 헤더 쪽이 스크롤 위치와 상관없이 보이므로 이쪽이 받는 게 맞다.
 * wide: 검색 결과 화면 헤더의 넓은 상자
 * hero: 홈 히어로의 큰 상자
 */
type SearchFormVariant = "compact" | "wide" | "hero";

const FORM: Record<SearchFormVariant, string> = {
  compact:
    "w-60 min-w-0 gap-2 rounded-[9px] bg-surface-2 px-3 text-[13px] elevate-control focus-within:elevate-1",
  wide:
    "min-w-0 flex-1 gap-2 rounded-[9px] bg-surface-2 px-3 text-[13.5px] elevate-control focus-within:elevate-1",
  hero:
    "max-w-[620px] gap-3 rounded-xl bg-surface px-[18px] text-[15px] elevate-1 hover:elevate-2 focus-within:elevate-2",
};

/** 위아래 여백을 입력칸에 두어 상자 어디를 눌러도 입력칸이 잡히게 한다. */
const INPUT: Record<SearchFormVariant, string> = {
  compact: "py-2",
  wide: "py-2",
  hero: "py-[15px]",
};

const ICON: Record<SearchFormVariant, string> = {
  compact: "h-[13px] w-[13px] border-[1.5px]",
  wide: "h-[13px] w-[13px] border-[1.5px]",
  hero: "h-4 w-4 border-[1.8px]",
};

type SearchFormProps = {
  variant: SearchFormVariant;
  placeholder?: string;
  /** 처음 채워 둘 검색어. 검색 결과 화면에서 지금 검색어를 보여 준다. */
  defaultQuery?: string;
  autoFocus?: boolean;
};

/**
 * 검색 상자. 제출하면 검색 결과 화면으로 간다.
 *
 * `next/form`이라 하이드레이션 전에도 일반 GET 폼으로 동작하고, 그 뒤로는 화면 전체를 다시 받지 않고 이동한다.
 */
export function SearchForm({
  variant,
  placeholder = "문서 검색",
  defaultQuery = "",
  autoFocus = false,
}: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcut = variant === "compact";
  useSlashShortcut(inputRef, shortcut);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const input = inputRef.current;
    if (!input) return;

    const query = input.value.trim();
    if (!query) {
      // 빈 검색어로 검색 화면에 가 봐야 보여 줄 것이 없다. 이동하지 않고 입력을 기다린다.
      event.preventDefault();
      input.value = "";
      input.focus();
      return;
    }
    // `next/form`이 이 값으로 주소를 만든다. 앞뒤 공백 때문에 같은 검색이 다른 주소가 되지 않게 한다.
    input.value = query;
  }

  return (
    <Form
      action={ROUTES.search()}
      role="search"
      onSubmit={onSubmit}
      className={`group flex items-center transition ${FORM[variant]}`}
    >
      <span
        aria-hidden
        className={`inline-block flex-shrink-0 rounded-full border-fg-subtle ${ICON[variant]}`}
      />
      <input
        ref={inputRef}
        // 뒤로 가기처럼 검색어만 바뀐 채 같은 화면이 다시 그려질 때, 입력해 둔 값 대신 주소의 검색어를 보이게 한다.
        key={defaultQuery}
        type="search"
        name={SEARCH_QUERY_PARAM}
        defaultValue={defaultQuery}
        placeholder={placeholder}
        aria-label="문서 검색"
        aria-keyshortcuts={shortcut ? "/" : undefined}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        enterKeyHint="search"
        autoFocus={autoFocus}
        className={`min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:appearance-none ${INPUT[variant]}`}
      />
      {shortcut && (
        <kbd
          aria-hidden
          className="flex-shrink-0 rounded bg-elevated px-[5px] py-px font-mono text-[11px] text-fg-subtle group-focus-within:hidden max-sm:hidden"
        >
          /
        </kbd>
      )}
    </Form>
  );
}
