import type {
  LibraryInfographicItem,
  LibraryInfographicSection,
} from '../../../../shared/contracts/library';
import {
  INFOGRAPHIC_PIECES,
  type InfographicPieceInfo,
  type InfographicThemeId,
} from '../../../../shared/infographic-pieces';

import type { ParsedInfographic } from './infographic';

/** Palavras que não ajudam a achar uma peça. */
const STOP = new Set([
  'para',
  'com',
  'uma',
  'umas',
  'uns',
  'dos',
  'das',
  'por',
  'que',
  'como',
  'mais',
  'menos',
  'sobre',
  'entre',
  'sem',
  'sao',
  'ser',
  'tem',
  'seu',
  'sua',
  'seus',
  'suas',
  'isso',
  'esse',
  'essa',
  'ate',
  'nos',
  'nas',
  'pelo',
  'pela',
  'quando',
  'onde',
  'cada',
  'muito',
  'muitos',
]);

/** Minúsculas, sem acento e sem pontuação. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

/** Raiz curta de uma palavra: "endividamento" e "endividar" se encontram em "endivi". */
const stem = (word: string) => word.slice(0, 5);

interface IndexedPiece {
  info: InfographicPieceInfo;
  name: Set<string>;
  tags: Set<string>;
  nameStems: Set<string>;
  tagStems: Set<string>;
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
  };
});

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
