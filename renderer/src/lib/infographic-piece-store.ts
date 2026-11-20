import type { Piece } from './infographic-pieces';

/**
 * Os desenhos das peças (`infographic-pieces.ts`, ~130 KB) são carregados **sob demanda**: só quando a
 * primeira peça vai para a tela, em um arquivo à parte. O app abre sem eles. Nomes, chaves e
 * palavras-chave (o que a busca e a IA usam) ficam no catálogo leve de `#shared/infographic-pieces`,
 * então a busca nunca espera o desenho.
 */
let shapes: ReadonlyMap<string, Piece> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Baixa os desenhos (uma vez só) e avisa quem está esperando. Falha não derruba nada: tenta de novo na próxima chamada. */
export function loadPieceShapes(): Promise<void> {
  if (shapes) {
    return Promise.resolve();
  }

  loading ??= import('./infographic-pieces')
    .then((module) => {
      shapes = new Map(module.INFOGRAPHIC_PIECE_SHAPES.map((piece) => [piece.key, piece]));
      listeners.forEach((notify) => notify());
    })
    .catch(() => {
      loading = null;
    });

  return loading;
}

/** Os desenhos já chegaram? */
export const pieceShapesLoaded = (): boolean => shapes !== null;

/** O desenho de uma peça, ou `undefined` se ainda não chegou ou a chave não existe. */
export const getPieceShapes = (key: string): Piece | undefined => shapes?.get(key);

/** Para `useSyncExternalStore`: avisa quando os desenhos chegam. */
export function subscribePieceShapes(notify: () => void): () => void {
  listeners.add(notify);

  return () => {
    listeners.delete(notify);
  };
}

/** Só para testes: volta ao estado "ainda não carregou". */
export function resetPieceShapesForTests(): void {
  shapes = null;
  loading = null;
}
