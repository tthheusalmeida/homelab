import { useCallback, useEffect, useRef, useState } from "react";

import {
  findMatchesIn,
  prepareText,
  searchPhrase,
  searchTerms,
  type PreparedText,
} from "#lib/find";

const MATCH = "find-match";
const CURRENT = "find-current";

/** Hexágono da margem (14 x 16 px): afastamento do texto, folga da borda da janela e meia altura. */
const MARKER_GAP = 22;
const MARKER_EDGE = 4;
const MARKER_HALF = 8;

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

/**
 * Texto já preparado de cada trecho do livro: preparar é o passo caro, e assim cada tecla nova só
 * faz `indexOf` (o cache vale enquanto o texto do nó não muda).
 */
const prepared = new WeakMap<Node, { text: string; data: PreparedText }>();

function preparedOf(node: Node): PreparedText {
  const text = node.nodeValue ?? "";
  const cached = prepared.get(node);

  if (cached && cached.text === text) {
    return cached.data;
  }

  const data = prepareText(text);

  prepared.set(node, { text, data });

  return data;
}

function collectRanges(container: HTMLElement, terms: string[]): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const { start, end } of findMatchesIn(preparedOf(node), terms)) {
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
const MIN_QUERY = 2;
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
  /** Marca só a ocorrência atual (as outras somem) ou volta a marcar todas. */
  setOnlyCurrent: (value: boolean) => void;
  /** Some com a marca atual em `ms` milissegundos (opacidade). */
  fadeOut: (ms: number) => void;
  /** Cancela o desvanecer e devolve a marca à opacidade total. */
  unfade: () => void;
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
  /** Já navegou (Enter, setas ou clique) nesta consulta? O primeiro Enter vai à primeira ocorrência. */
  const visited = useRef(false);
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(-1);
  const [snippets, setSnippets] = useState<FoundSnippet[]>([]);
  const currentRef = useRef<Range | undefined>(undefined);
  const fadeRef = useRef<Animation | null>(null);
  const [onlyCurrent, setOnlyCurrent] = useState(false);
  const onlyCurrentRef = useRef(false);

  onlyCurrentRef.current = onlyCurrent;

  // Com 1 letra são milhares de ocorrências e a tela trava; a barra só busca a partir de 2.
  const phrase = searchPhrase(query);
  const termsKey = phrase.length >= MIN_QUERY ? phrase : "";

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
    paint(MATCH, onlyCurrentRef.current ? [] : ranges);
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

  // Só a ocorrência atual marcada (depois de escolher um trecho na lista).
  useEffect(() => {
    paint(MATCH, onlyCurrent ? [] : rangesRef.current);
  }, [onlyCurrent]);

  // Hexágono na margem, na linha da ocorrência atual: um elemento só, fora do texto do livro.
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const markerFadeRef = useRef<Animation | null>(null);

  useEffect(() => {
    if (!container) {
      return;
    }

    const marker = document.createElement("span");

    marker.className = "find-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.hidden = true;
    document.body.appendChild(marker);
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [container]);

  const placeMarker = useCallback(() => {
    const marker = markerRef.current;
    const range = currentRef.current;

    if (!marker) {
      return;
    }

    const rect = range?.getBoundingClientRect?.();

    if (
      !container ||
      !rect ||
      rect.height === 0 ||
      rect.bottom < 0 ||
      rect.top > window.innerHeight
    ) {
      marker.hidden = true;

      return;
    }

    const left = Math.max(
      MARKER_EDGE,
      container.getBoundingClientRect().left - MARKER_GAP,
    );

    marker.style.transform = `translate(${left}px, ${rect.top + rect.height / 2 - MARKER_HALF}px)`;
    marker.hidden = false;
  }, [container]);

  useEffect(() => {
    const range = rangesRef.current[index];

    currentRef.current = range;
    paint(CURRENT, range ? [range] : []);

    if (!range) {
      revealedFor.current = "";
      markerFadeRef.current?.cancel();
      markerFadeRef.current = null;
    } else if (revealedFor.current !== termsKey) {
      // Consulta nova: a tela não rola sozinha; só ao navegar (Enter) ou clicar num trecho.
      revealedFor.current = termsKey;
      visited.current = false;
    }

    placeMarker();

    if (!range) {
      return () => paint(CURRENT, []);
    }

    // Acompanha a rolagem (inclusive a suave até o trecho), no máximo uma vez por quadro.
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(placeMarker);
    };

    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
      paint(CURRENT, []);
    };
  }, [index, termsKey, count, placeMarker]);

  const unfade = useCallback(() => {
    fadeRef.current?.cancel();
    fadeRef.current = null;
    markerFadeRef.current?.cancel();
    markerFadeRef.current = null;
  }, []);

  /**
   * Some com a marca atual em `ms` (opacidade). O destaque do navegador não anima, então a
   * variável `--find-alpha` (registrada em global.css) é animada só no elemento da ocorrência
   * e o CSS a usa na cor: um elemento, sem redesenhar o texto.
   */
  const fadeOut = useCallback(
    (ms: number) => {
      const element = currentRef.current?.startContainer.parentElement;

      unfade();

      if (
        !element?.animate ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      fadeRef.current = element.animate(
        { "--find-alpha": [1, 0] } as PropertyIndexedKeyframes,
        { duration: ms, easing: "ease-out", fill: "forwards" },
      );

      // O hexágono da margem não está dentro do elemento: esmaece junto, pela própria opacidade.
      markerFadeRef.current =
        markerRef.current?.animate?.(
          { opacity: [1, 0] },
          { duration: ms, easing: "ease-out", fill: "forwards" },
        ) ?? null;
    },
    [unfade],
  );

  useEffect(() => unfade, [unfade]);

  const go = useCallback((delta: 1 | -1) => {
    const total = rangesRef.current.length;

    if (total === 0) {
      return;
    }

    // A consulta ainda não foi visitada: o primeiro "próxima" mostra a primeira ocorrência
    // (e o primeiro "anterior", a última), em vez de pular uma.
    const first = !visited.current;

    visited.current = true;

    setIndex((current) => {
      const next = first
        ? delta === 1
          ? Math.max(current, 0)
          : total - 1
        : (current + delta + total) % total;

      reveal(rangesRef.current[next]);

      return next;
    });
  }, []);

  const select = useCallback((target: number) => {
    const range = rangesRef.current[target];

    if (range) {
      visited.current = true;
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
    setOnlyCurrent,
    fadeOut,
    unfade,
    snippets,
  };
}
