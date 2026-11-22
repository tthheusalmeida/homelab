import type {
  LibraryInfographicItem,
  LibraryInfographicSection,
} from '../../../../shared/contracts/library';
import {
  INFOGRAPHIC_PIECES,
  type InfographicPieceInfo,
  type InfographicThemeId,
} from '../../../../shared/infographic-pieces';

import { singular, synonymsOf } from '../../../../shared/infographic-synonyms';
import { stemOf as stem, wordsOf as tokens } from '../../../../shared/infographic-text';

import type { ParsedInfographic } from './infographic';

/** Quanto vale um sinônimo da palavra no nome ou nas palavras-chave (sempre menos que a palavra exata: 4 e 3). */
const SYNONYM_NAME = 2;
const SYNONYM_TAG = 1.5;

interface IndexedPiece {
  info: InfographicPieceInfo;
  name: Set<string>;
  tags: Set<string>;
  nameStems: Set<string>;
  tagStems: Set<string>;
  /** Palavras no singular, para casar com os sinônimos. */
  nameSingular: Set<string>;
  tagSingular: Set<string>;
}

const INDEX: IndexedPiece[] = INFOGRAPHIC_PIECES.map((info) => {
  const name = new Set(tokens(info.name));
  const tags = new Set(tokens(info.tags));

  return {
    info,
    name,
    tags,
    nameStems: new Set([...name].map(stem)),
    tagStems: new Set([...tags].map(stem)),
    nameSingular: new Set([...name].map(singular)),
    tagSingular: new Set([...tags].map(singular)),
  };
});

/** Alguma peça tem esta palavra (ou uma de mesma raiz) no nome ou nas palavras-chave? */
function hasDirectMatch(word: string): boolean {
  const root = stem(word);

  return INDEX.some(
    (piece) =>
      piece.name.has(word) ||
      piece.tags.has(word) ||
      piece.nameStems.has(root) ||
      piece.tagStems.has(root),
  );
}

/** Peças genéricas, na ordem em que servem de reserva quando nada do tema combina. */
const FALLBACK_ORDER = [
  'generico.estrela',
  'generico.brilho',
  'generico.bandeira',
  'generico.mais',
];

/**
 * Escolhe a peça do banco que melhor combina com um texto (título e frase do espaço), por palavras
 * em comum com o nome e as palavras-chave da peça. Peça já usada no infográfico nunca se repete e a do
 * tema da capa ganha um pouco. Sem nenhuma palavra em comum, pega uma peça ainda
 * não usada do tema da capa e, por último, uma genérica. É o que impede um espaço de ficar com um
 * hexágono vazio quando a IA erra ou esquece a chave.
 */
export class PieceResolver {
  private readonly used = new Set<string>();

  constructor(private readonly theme: InfographicThemeId | null) {}

  /** Marca peças que a IA já escolheu certo, para o resolvedor não as repetir. */
  reserve(key: string): void {
    if (key !== '') {
      this.used.add(key);
    }
  }

  resolve(text: string): string {
    const words = tokens(text);
    const wordStems = new Set(words.map(stem));
    // Sinônimos só das palavras que nenhuma peça tem (nem pela raiz): quem já casa direto não precisa
    // deles, e assim eles nunca tiram uma peça de quem acertou a palavra. Contam uma vez por palavra.
    const related = words
      .filter((word) => !hasDirectMatch(word))
      .map((word) => synonymsOf(word).map(singular));
    let best: { key: string; score: number } | null = null;

    for (const piece of INDEX) {
      // peça já usada no infográfico não se repete
      if (this.used.has(piece.info.key)) {
        continue;
      }

      let score = 0;

      for (const word of words) {
        if (piece.name.has(word)) score += 4;
        else if (piece.tags.has(word)) score += 3;
      }

      for (const root of wordStems) {
        if (piece.nameStems.has(root)) score += 1.5;
        else if (piece.tagStems.has(root)) score += 1;
      }

      for (const group of related) {
        if (group.some((word) => piece.nameSingular.has(word))) score += SYNONYM_NAME;
        else if (group.some((word) => piece.tagSingular.has(word))) score += SYNONYM_TAG;
      }

      if (score === 0) {
        continue;
      }

      if (piece.info.theme === this.theme) score += 1;

      if (!best || score > best.score) {
        best = { key: piece.info.key, score };
      }
    }

    const key = best && best.score > 0 ? best.key : this.fallback();

    this.used.add(key);

    return key;
  }

  private fallback(): string {
    const themed = INFOGRAPHIC_PIECES.find(
      (piece) => piece.theme === this.theme && !this.used.has(piece.key),
    );

    return themed?.key ?? FALLBACK_ORDER.find((key) => !this.used.has(key)) ?? FALLBACK_ORDER[0];
  }
}

/** Tema de uma peça (o da capa guia a escolha das outras). */
function themeOf(key: string): InfographicThemeId | null {
  return INFOGRAPHIC_PIECES.find((piece) => piece.key === key)?.theme ?? null;
}

/** Texto que descreve um espaço, para achar a peça dele. */
const describe = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' ');

/** Modelos que desenham a peça da própria seção (os outros ignoram o campo). */
const SECTION_PIECE_LAYOUTS = new Set(['funnel', 'numbers', 'radial', 'mosaic']);

function fillItems(
  section: LibraryInfographicSection,
  resolver: PieceResolver,
): LibraryInfographicItem[] {
  return section.items.map((item) => {
    // Os critérios do comparativo não desenham peça: ficam como estão.
    if (section.layout === 'versus' || item.piece !== '') {
      return item;
    }

    return { ...item, piece: resolver.resolve(describe(item.title, item.text, item.tag)) };
  });
}

/**
 * Completa as peças que a IA deixou vazias ou errou: capa, lados do comparativo, peça da seção
 * (nos modelos que a usam) e itens. As peças que ela acertou são mantidas e reservadas (para não
 * se repetirem). Chaves inválidas já chegam vazias do validador.
 */
export function fillMissingPieces(parsed: ParsedInfographic): ParsedInfographic {
  const resolver = new PieceResolver(themeOf(parsed.piece));

  // Primeiro reserva o que a IA acertou, para escolher o resto sem repetir.
  resolver.reserve(parsed.piece);

  for (const section of parsed.sections) {
    resolver.reserve(section.piece);
    section.sides?.forEach((side) => resolver.reserve(side.piece));
    section.items.forEach((item) => resolver.reserve(item.piece));
  }

  // O tema da capa vem da peça da capa ou, se faltou, do primeiro texto que combina.
  const cover =
    parsed.piece !== ''
      ? parsed.piece
      : resolver.resolve(describe(parsed.kicker, parsed.title, parsed.subtitle));

  return {
    ...parsed,
    piece: cover,
    sections: parsed.sections.map((section) => ({
      ...section,
      piece:
        section.piece === '' && SECTION_PIECE_LAYOUTS.has(section.layout)
          ? resolver.resolve(describe(section.title, section.subtitle))
          : section.piece,
      ...(section.sides
        ? {
            sides: section.sides.map((side) =>
              side.piece === '' ? { ...side, piece: resolver.resolve(side.title) } : side,
            ),
          }
        : {}),
      items: fillItems(section, resolver),
    })),
  };
}
