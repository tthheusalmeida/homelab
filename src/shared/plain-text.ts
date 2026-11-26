import { mapOutsideMath } from './math-text';

/**
 * Tira markdown e espaços repetidos de um texto vindo da IA; o que não é texto vira vazio. As
 * fórmulas (`$...$`) ficam como estão: `_`, `*` e `~` fazem parte do LaTeX (`F_{n-1}`).
 */
export function plainText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return mapOutsideMath(value, (prose) => prose.replace(/[*_`~#>]+/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}
