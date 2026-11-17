import type { SnippetSegment } from "./types";
import { INLINE_TOKEN } from "./wiki-syntax";

/** 검색어의 최대 길이. 백엔드(`SearchArticleReqDto.MAX_QUERY_LENGTH`)가 이보다 긴 검색어에 400을 준다. */
export const SEARCH_QUERY_MAX_LENGTH = 100;

/**
 * `=== 소제목 ===`, `==== 소제목 ====`. 백엔드가 줄을 공백으로 이어 붙여 보내므로 줄 경계로는 가릴 수 없고,
 * 양쪽 `=` 개수가 같은지만 본다. `== 제목 ==`은 백엔드가 이미 지워 보낸다.
 */
const SUBHEADING = /(={3,})([^=]+)(={3,})/g;
const MAX_SUBHEADING_MARK = 4;

/**
 * 검색 스니펫에 남은 위키 문법 기호를 걷어내, 문서 화면에서 보이는 글자만 남긴다.
 *
 * 백엔드는 `== 제목 ==`과 `[[문서명]]`만 지운 본문으로 스니펫을 만든다. 문서 화면(`parseWikiText`)이 그리는
 * 나머지 문법 — `=== 소제목 ===`, `[[문서명|보일 글자]]`, `'''굵게'''`, `[보일 글자](주소)` — 은 기호째 오므로 여기서 벗긴다.
 * 강조 위치는 서버가 정한 것을 글자 단위로 따라가 그대로 지킨다.
 *
 * 스니펫 양끝에서 잘린 문법(`…명|보일 글자]]`)과, 줄이 이어 붙어 글자와 구별할 수 없게 된 목록 기호(`* `)는 남는다.
 */
export function stripSnippetSyntax(
  segments: SnippetSegment[],
): SnippetSegment[] {
  const text = segments.map((segment) => segment.text).join("");
  const removed: boolean[] = new Array(text.length).fill(false);
  const remove = (from: number, to: number) => removed.fill(true, from, to);

  markInlineSyntax(text, 0, remove);

  for (const match of text.matchAll(SUBHEADING)) {
    const [token, opening, body, closing] = match;
    if (
      opening.length !== closing.length ||
      opening.length > MAX_SUBHEADING_MARK ||
      body.trim() === ""
    ) {
      continue;
    }
    const end = match.index + token.length;
    remove(match.index, match.index + opening.length);
    remove(end - closing.length, end);
  }

  // 지우지 않은 글자를 원래 강조 여부대로 다시 묶는다.
  const result: SnippetSegment[] = [];
  let offset = 0;
  for (const segment of segments) {
    const highlight = segment.highlight === true;
    for (const char of segment.text.split("")) {
      if (!removed[offset++]) appendChar(result, char, highlight);
    }
  }
  return result;
}

/** 문서 화면과 같은 규칙으로 링크·굵은 글씨를 찾아, 화면에 보이지 않는 기호만 지운다. */
function markInlineSyntax(
  text: string,
  offset: number,
  remove: (from: number, to: number) => void,
) {
  for (const match of text.matchAll(INLINE_TOKEN)) {
    const [token, linkBody, boldBody, markdownLabel] = match;
    const start = offset + match.index;
    const end = start + token.length;

    if (boldBody !== undefined) {
      remove(start, start + 3);
      remove(end - 3, end);
      // 굵은 글씨 안의 링크도 문서 화면에서는 링크로 그려진다.
      markInlineSyntax(boldBody, start + 3, remove);
      continue;
    }

    // 문서 화면은 `[보일 글자](주소)`의 글자만 보인다.
    if (markdownLabel !== undefined) {
      remove(start, start + 1);
      remove(start + 1 + markdownLabel.length, end);
      continue;
    }

    // 주소만 적은 링크는 문서 화면에서도 주소 그대로 보인다.
    if (linkBody === undefined) continue;

    const separator = linkBody.indexOf("|");
    const target = separator === -1 ? linkBody : linkBody.slice(0, separator);
    // 문서명이 빈 링크는 문서 화면에서도 글자 그대로 남는다.
    if (target.trim() === "") continue;

    // 문서 화면은 `|` 뒤의 글자가 있으면 그것을, 없으면 문서명을 보인다.
    const label = separator === -1 ? "" : linkBody.slice(separator + 1);
    const bodyStart = start + 2;
    const [visibleFrom, visibleTo] = label.trim()
      ? [bodyStart + separator + 1, end - 2]
      : [bodyStart, bodyStart + target.length];
    remove(start, visibleFrom);
    remove(visibleTo, end);
  }
}

function appendChar(
  segments: SnippetSegment[],
  char: string,
  highlight: boolean,
) {
  const last = segments[segments.length - 1];
  if (last && (last.highlight === true) === highlight) {
    last.text += char;
  } else {
    segments.push(highlight ? { text: char, highlight } : { text: char });
  }
}
