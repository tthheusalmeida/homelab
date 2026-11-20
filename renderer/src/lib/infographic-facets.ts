/** Uma faceta do "papel facetado": um triângulo claro ou escuro, quase transparente, sobre a peça. */
export interface Facet {
  /** Os três vértices no formato do atributo `points` do SVG. */
  points: string;
  /** Faceta clara (branca) ou escura (preta). */
  light: boolean;
  /** Opacidade, entre 0,03 e 0,2: o suficiente para dar volume sem sujar a cor. */
  opacity: number;
}

/** Gerador pseudoaleatório simples e determinístico (a mesma semente dá sempre as mesmas facetas). */
function seeded(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };
}

/** Número estável a partir de um texto (a chave da peça), usado como semente. */
export function seedOf(text: string): number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0;
  }

  return hash;
}

const round = (value: number) => +value.toFixed(1);

/**
 * Facetas de uma peça: uma grade de `cells` x `cells` sobre o quadro de 100 x 100, com os pontos
 * internos deslocados ao acaso, cada célula dividida em dois triângulos. As bordas da grade ficam
 * fixas, para as facetas cobrirem o quadro todo. Determinística para uma mesma semente.
 */
export function facetsOf(seed: number, cells = 5): Facet[] {
  const next = seeded(seed);
  const step = 100 / cells;
  const grid: Array<[number, number]> = [];

  for (let row = 0; row <= cells; row += 1) {
    for (let col = 0; col <= cells; col += 1) {
      const edgeX = col === 0 || col === cells;
      const edgeY = row === 0 || row === cells;

      grid.push([
        round(col * step + (edgeX ? 0 : (next() - 0.5) * step * 0.8)),
        round(row * step + (edgeY ? 0 : (next() - 0.5) * step * 0.8)),
      ]);
    }
  }

  const at = (col: number, row: number) => grid[row * (cells + 1) + col];
  const facets: Facet[] = [];
  const add = (a: [number, number], b: [number, number], c: [number, number]) => {
    facets.push({
      points: [a, b, c].map(([x, y]) => `${x},${y}`).join(' '),
      light: next() > 0.5,
      opacity: +(0.03 + next() * 0.17).toFixed(2),
    });
  };

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      add(at(col, row), at(col + 1, row), at(col + 1, row + 1));
      add(at(col, row), at(col + 1, row + 1), at(col, row + 1));
    }
  }

  return facets;
}
