/**
 * Fórmulas no meio de um texto corrido: LaTeX entre `$...$`. É a mesma regra para quem escreve o
 * texto (IA), quem limpa (back) e quem desenha (renderer), então fica aqui, num lugar só.
 *
 * Para `R$ 10 e R$ 20` não virar fórmula, vale a regra do pandoc: o `$` de abrir não é seguido de
 * espaço, o de fechar não é precedido de espaço nem seguido de dígito, e `\$` é um cifrão comum.
 */
const INLINE_MATH = /(?<!\\)\$(?=\S)([^$\n]+?)(?<=\S)(?<!\\)\$(?!\d)/g;

/** Um pedaço de texto: prosa ou fórmula (o LaTeX, sem os `$`). */
export interface MathSegment {
  kind: 'text' | 'math';
  value: string;
}

/** Os trechos do texto na ordem: `raw` é o que estava escrito, `value` o que significa. */
function* scan(text: string): Generator<MathSegment & { raw: string }> {
  let last = 0;

  for (const match of text.matchAll(INLINE_MATH)) {
    yield textSegment(text.slice(last, match.index));
    yield { kind: 'math', value: match[1], raw: match[0] };
    last = match.index + match[0].length;
  }

  yield textSegment(text.slice(last));
}

function textSegment(raw: string): MathSegment & { raw: string } {
  return { kind: 'text', value: raw.replace(/\\\$/g, '$'), raw };
}

/** Separa o texto em prosa e fórmulas (sem pedaços vazios); `\$` volta a ser `$` na prosa. */
export function splitMath(text: string): MathSegment[] {
  return [...scan(text)]
    .filter((segment) => segment.value !== '')
    .map(({ kind, value }) => ({ kind, value }));
}

/** Aplica `transform` só à prosa; as fórmulas (com seus `$`) passam intactas. */
export function mapOutsideMath(text: string, transform: (prose: string) => string): string {
  return [...scan(text)]
    .map((segment) => (segment.kind === 'math' ? segment.raw : transform(segment.raw)))
    .join('');
}
