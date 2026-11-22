import { useCallback, useEffect, useRef, useState } from "react";

import { findMatches, searchPhrase, searchTerms } from "#lib/find";

const MATCH = "find-match";
const CURRENT = "find-current";

/** A CSS Custom Highlight API existe? (navegadores recentes; o jsdom não tem) */
function highlightsSupported() {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

function paint(name: string, ranges: Range[]) {
  if (!highlightsSupported()) {
    return;
  }

  if (ranges.length === 0) {
    CSS.highlights.delete(name);
  } else {
    CSS.highlights.set(name, new Highlight(...ranges));
  }
}

function collectRanges(container: HTMLElement, terms: string[]): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const { start, end } of findMatches(node.nodeValue ?? "", terms)) {
      const range = document.createRange();

      range.setStart(node, start);
      range.setEnd(node, end);
      ranges.push(range);
    }
  }

  return ranges;
}

function reveal(range: Range | undefined) {
  range?.startContainer.parentElement?.scrollIntoView?.({
    block: "center",
    behavior: "smooth",
  });
}

/** Trecho ao redor de uma ocorrência (para a lista de resultados). */
export interface FoundSnippet {
  before: string;
  match: string;
  after: string;
}

/** Quantos trechos entram na lista (o contador e a navegação seguem contando todos). */
const MAX_SNIPPETS = 100;
const SNIPPET_CONTEXT = 36;

function snippetOf(range: Range): FoundSnippet {
  const text = range.startContainer.nodeValue ?? "";
  const from = Math.max(0, range.startOffset - SNIPPET_CONTEXT);
  const to = Math.min(text.length, range.endOffset + SNIPPET_CONTEXT);

  return {
    before: (from > 0 ? "…" : "") + text.slice(from, range.startOffset),
    match: text.slice(range.startOffset, range.endOffset),
    after: text.slice(range.endOffset, to) + (to < text.length ? "…" : ""),
  };
}

export interface TextHighlight {
  /** Quantas ocorrências foram achadas no texto. */
  count: number;
  /** Ocorrência atual (0 a count-1); -1 sem resultado. */
  index: number;
  next: () => void;
  prev: () => void;
  /** Vai para a ocorrência de número `target` (0 a count-1), rolando até ela. */
  select: (target: number) => void;
  /** Trechos das primeiras ocorrências, na ordem do texto. */
  snippets: FoundSnippet[];
}

/**
 * Destaca no texto as ocorrências da consulta (sem alterar o HTML) e deixa ir
 * para a próxima/anterior, rolando até ela. Procura primeiro a frase inteira
 * ("casa da vida"); se ela não existe, cai para cada palavra (em qualquer
 * pedaço de palavra, sem "da", "de" soltos). `version` muda quando o texto é redesenhado, para refazer a busca.
 */
export function useTextHighlight(
  container: HTMLElement | null,
  query: string,
  version?: unknown,
): TextHighlight {
  const rangesRef = useRef<Range[]>([]);
  const revealedFor = useRef("");
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(-1);
  const [snippets, setSnippets] = useState<FoundSnippet[]>([]);

  const termsKey = searchPhrase(query);

  useEffect(() => {
    let ranges =
      container && termsKey ? collectRanges(container, [termsKey]) : [];

    if (container && termsKey && ranges.length === 0) {
      const words = searchTerms(termsKey);

      if (words.length > 1 || words[0] !== termsKey) {
        ranges = collectRanges(container, words);
      }
    }

    rangesRef.current = ranges;
    paint(MATCH, ranges);
    setCount(ranges.length);
    setSnippets(ranges.slice(0, MAX_SNIPPETS).map(snippetOf));
    setIndex((current) => {
      if (ranges.length === 0) {
        return -1;
      }

      // Mesma consulta e o texto só foi redesenhado: fica onde estava.
      return revealedFor.current === termsKey && current >= 0
        ? Math.min(current, ranges.length - 1)
        : 0;
    });

    return () => paint(MATCH, []);
  }, [container, termsKey, version]);

  useEffect(() => {
    const range = rangesRef.current[index];

    paint(CURRENT, range ? [range] : []);

    if (!range) {
      revealedFor.current = "";
    } else if (revealedFor.current !== termsKey) {
      // Consulta nova: leva até a primeira ocorrência.
      revealedFor.current = termsKey;
      reveal(range);
    }

    return () => paint(CURRENT, []);
  }, [index, termsKey, count]);

  const go = useCallback((delta: 1 | -1) => {
    const total = rangesRef.current.length;

    if (total === 0) {
      return;
    }

    setIndex((current) => {
      const next = (current + delta + total) % total;

      reveal(rangesRef.current[next]);

      return next;
    });
  }, []);

  const select = useCallback((target: number) => {
    const range = rangesRef.current[target];

    if (range) {
      reveal(range);
      setIndex(target);
    }
  }, []);

  return {
    count,
    index,
    next: useCallback(() => go(1), [go]),
    prev: useCallback(() => go(-1), [go]),
    select,
    snippets,
  };
}
