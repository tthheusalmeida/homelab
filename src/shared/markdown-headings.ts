/**
 * Títulos de um Markdown e os ids de âncora deles. Fonte **única** das duas pontas: o visualizador
 * (sumário e rolagem até a seção) e o indexador da busca (link do trecho até a seção) precisam
 * chegar ao mesmo id, senão o link cai no lugar errado.
 */

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface ScannedHeading extends Heading {
  /** Linha (base 1) onde o título aparece. */
  line: number;
}

/** Minúsculas, sem acento e com espaços simples. */
export function normalizeHeadingKey(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** `Ligações Químicas!` → `ligacoes-quimicas` (ids de âncora de títulos). */
export function slugifyHeading(text: string): string {
  return (
    normalizeHeadingKey(text)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'secao'
  );
}

/**
 * Gera ids únicos na ordem em que os títulos aparecem: o segundo título igual vira `-2`, o
 * terceiro `-3`.
 */
export function createHeadingIdGenerator(): (text: string) => string {
  const seen = new Map<string, number>();

  return (text) => {
    const base = slugifyHeading(text);
    const count = (seen.get(base) ?? 0) + 1;

    seen.set(base, count);

    return count === 1 ? base : `${base}-${count}`;
  };
}

/** Tira a marcação inline de um título (links, imagens, ênfase, código). */
function plainHeadingText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`~]/g, '')
    .trim();
}

/** Todos os títulos (`#` a `######`) com linha e id, ignorando blocos de código. */
export function scanHeadings(markdown: string): ScannedHeading[] {
  const nextId = createHeadingIdGenerator();
  const headings: ScannedHeading[] = [];
  let fence: string | null = null;

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);

    if (fenceMatch) {
      fence = fence === null ? fenceMatch[1] : fence === fenceMatch[1] ? null : fence;
      continue;
    }

    if (fence !== null) {
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);

    if (!match) {
      continue;
    }

    const text = plainHeadingText(match[2]);

    if (text === '') {
      continue;
    }

    headings.push({
      level: match[1].length,
      text,
      id: nextId(text),
      line: index + 1,
    });
  }

  return headings;
}
