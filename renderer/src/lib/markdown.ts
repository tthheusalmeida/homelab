import { scanHeadings, type Heading } from "#shared/markdown-headings";

/** A regra dos ids de âncora é única (a busca usa a mesma): ver `shared/markdown-headings.ts`. */
export { createHeadingIdGenerator, slugifyHeading } from "#shared/markdown-headings";
export type { Heading } from "#shared/markdown-headings";

const FENCE = /^\s*(```|~~~)/;
/** Uma linha que é só uma fórmula entre `$$` (sem outro `$$` no meio). */
const SINGLE_LINE_DISPLAY_MATH = /^(\s*)\$\$((?:(?!\$\$).)+)\$\$\s*$/;

/** Fórmula `$...$` ou `$$...$$` inteira dentro de crases (a IA às vezes a trata como código). */
const MATH_IN_CODE = /`(\${1,2}(?=[^\s$])[^$`\n]+?(?<=[^\s$])\${1,2})`/g;

/**
 * Prepara as fórmulas para o `remark-math`: fórmula inteira entre crases (`` `$x$` ``) vira fórmula
 * (texto como `$HOME` ou `R$ 10` não casa); `$$...$$` sozinha numa linha vira fórmula **em bloco**
 * (grande e centralizada), pois o `remark-math` só faz bloco quando os `$$` estão em linhas próprias
 * e a IA costuma escrever numa linha só. Blocos de código ficam como estão.
 */
export function displayMath(markdown: string): string {
  let fence: string | null = null;

  return markdown
    .split("\n")
    .flatMap((line) => {
      const fenceMatch = line.match(FENCE);

      if (fenceMatch) {
        fence = fence === null ? fenceMatch[1] : fence === fenceMatch[1] ? null : fence;

        return [line];
      }

      if (fence !== null) {
        return [line];
      }

      const text = line.replace(MATH_IN_CODE, "$1");
      const single = text.match(SINGLE_LINE_DISPLAY_MATH);

      return single
        ? [`${single[1]}$$`, `${single[1]}${single[2].trim()}`, `${single[1]}$$`]
        : [text];
    })
    .join("\n");
}

/** Títulos `#` a `###` do Markdown, para o sumário. */
export function extractHeadings(markdown: string): Heading[] {
  return scanHeadings(markdown)
    .filter((heading) => heading.level <= 3)
    .map(({ level, text, id }) => ({ level, text, id }));
}

/**
 * Id de cada título pela linha em que ele começa. A renderização consulta por
 * linha (em vez de contar títulos ao renderizar), então os ids batem com o
 * sumário mesmo se o React renderizar um componente mais de uma vez.
 */
export function headingIdsByLine(markdown: string): Map<number, string> {
  return new Map(
    scanHeadings(markdown).map((heading) => [heading.line, heading.id]),
  );
}
