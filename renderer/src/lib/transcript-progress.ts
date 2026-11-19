/** Posição de um trecho na tela (o que `getBoundingClientRect` devolve). */
export interface ExcerptRect {
  top: number;
  height: number;
}

/** Folga entre o topo da área de leitura e a "linha de leitura" quando a rolagem está no começo. */
export const READING_LINE_OFFSET = 14;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Linha de leitura (coordenada na tela): começa perto do topo da área de rolagem e desce até o
 * fim dela conforme a rolagem avança. Assim o primeiro trecho começa vazio e o último termina
 * cheio, sem sobrar um pedaço que nunca é alcançado.
 */
export function readingLine(
  viewTop: number,
  viewHeight: number,
  scrollTop: number,
  maxScroll: number,
): number {
  const fraction = maxScroll > 0 ? clamp(scrollTop / maxScroll) : 0;

  return viewTop + READING_LINE_OFFSET + fraction * viewHeight;
}

/**
 * Quanto de cada trecho já foi lido (0 a 1) e qual é o atual: o primeiro que ainda não terminou
 * (o último, quando todos terminaram).
 */
export function computeExcerptProgress(
  rects: ExcerptRect[],
  line: number,
): { fractions: number[]; active: number } {
  const fractions = rects.map((rect) =>
    rect.height > 0 ? clamp((line - rect.top) / rect.height) : line >= rect.top ? 1 : 0,
  );
  const firstOpen = fractions.findIndex((fraction) => fraction < 1);

  return { fractions, active: firstOpen === -1 ? Math.max(0, rects.length - 1) : firstOpen };
}

/**
 * Quanto da linha da barra lateral já está preenchido (0 a 1). A linha vai do centro do primeiro
 * hexágono ao do último, então o hexágono `k` fica em `k / (n - 1)`: a linha chega nele quando o
 * trecho `k` começa e avança até o próximo conforme o trecho é lido.
 */
export function railFill(active: number, fraction: number, count: number): number {
  if (count <= 1) {
    return count === 1 ? clamp(fraction) : 0;
  }

  return clamp((active + fraction) / (count - 1));
}

/** Onde um trecho começa e termina na linha do tempo do áudio, em frações de 0 a 1. */
export interface ExcerptSpan {
  start: number;
  end: number;
}

/**
 * Posição de cada trecho na linha do tempo do áudio. O trecho termina onde o próximo começa; o
 * último não tem fim gravado, então usa-se a duração média dos anteriores (o áudio total é
 * estimado assim: início do último + essa média).
 */
export function excerptSpans(starts: number[]): ExcerptSpan[] {
  if (starts.length === 0) {
    return [];
  }

  const last = starts[starts.length - 1];
  const average = starts.length > 1 ? (last - starts[0]) / (starts.length - 1) : 1;
  const total = Math.max(last + Math.max(average, 1), 1);

  return starts.map((start, index) => ({
    start: clamp(start / total),
    end: clamp((starts[index + 1] ?? last + Math.max(average, 1)) / total),
  }));
}
