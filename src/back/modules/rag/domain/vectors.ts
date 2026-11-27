/** Vetor de um trecho, já com tamanho 1: a semelhança entre dois vira só uma soma de produtos. */
export function normalize(vector: ArrayLike<number>): Float32Array {
  const result = new Float32Array(vector.length);
  let norm = 0;

  for (let index = 0; index < vector.length; index += 1) {
    norm += vector[index] * vector[index];
  }

  const length = Math.sqrt(norm) || 1;

  for (let index = 0; index < vector.length; index += 1) {
    result[index] = vector[index] / length;
  }

  return result;
}

/** Semelhança (−1 a 1) entre dois vetores normalizados. */
export function similarity(a: Float32Array, b: Float32Array): number {
  const size = Math.min(a.length, b.length);
  let sum = 0;

  for (let index = 0; index < size; index += 1) {
    sum += a[index] * b[index];
  }

  return sum;
}

export function toBase64(vector: Float32Array): string {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString('base64');
}

export function fromBase64(text: string): Float32Array {
  const bytes = Buffer.from(text, 'base64');

  return new Float32Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

/** Constante do "reciprocal rank fusion": quanto menor, mais pesa o topo de cada lista. */
const RRF_K = 60;

/**
 * Junta duas listas ordenadas (a de palavras e a de sentido) numa só: cada item soma `1/(k+posição)`
 * em cada lista em que aparece. Não precisa comparar pontuações de escalas diferentes.
 */
export function fuseRankings(...rankings: string[][]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    ranking.forEach((id, position) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + position + 1));
    });
  }

  return scores;
}
