import { CHARS_PER_TOKEN } from './tokens';

/**
 * Quanto das páginas da biblioteca acompanha cada pergunta do chat. Depende de **dois** limites do
 * modelo, e vale o menor:
 * - a **janela de contexto**: janela curta recebe menos (cabe e não se perde);
 * - o **tamanho** (bilhões de parâmetros): modelo pequeno se perde com muitos trechos mesmo quando
 *   anuncia uma janela enorme (medido: o Qwen 3.5 de 0,8b, com janela de 262 mil tokens, disse
 *   "não encontrei" com 8 trechos certos na frente; o de 2b e o de 4b responderam bem).
 * Compartilhado entre o main (que escolhe os trechos) e a tela (que estima o tamanho do envio para
 * avisar conversa grande).
 */
export interface ContextBudget {
  /** Quantos trechos, no máximo. */
  maxHits: number;
  /** Quantos caracteres de trechos, no máximo. */
  maxChars: number;
}

const SMALL: ContextBudget = { maxHits: 3, maxChars: 3_000 };
const MEDIUM: ContextBudget = { maxHits: 5, maxChars: 6_000 };
const LARGE: ContextBudget = { maxHits: 8, maxChars: 12_000 };

/** Do menor para o maior: a posição serve para pegar o menor de dois orçamentos. */
const LADDER = [SMALL, MEDIUM, LARGE] as const;

/** Abaixo disso a janela é curta; a partir de `LARGE_WINDOW_TOKENS`, longa. */
export const SMALL_WINDOW_TOKENS = 16_384;
export const LARGE_WINDOW_TOKENS = 65_536;

/** Abaixo disso o modelo é pequeno (só o orçamento curto); abaixo de `LARGE_MODEL_BILLIONS`, no máximo o médio. */
export const SMALL_MODEL_BILLIONS = 3;
export const LARGE_MODEL_BILLIONS = 8;

/** A instrução fixa que abre o contexto (cerca de 150 tokens). */
export const CONTEXT_INSTRUCTION_TOKENS = 150;

function rungByWindow(windowTokens?: number | null): number {
  if (typeof windowTokens !== 'number' || !(windowTokens > 0)) {
    return 1;
  }

  if (windowTokens < SMALL_WINDOW_TOKENS) {
    return 0;
  }

  return windowTokens < LARGE_WINDOW_TOKENS ? 1 : 2;
}

/** Tamanho desconhecido não limita (a janela decide). */
function rungBySize(billions?: number | null): number {
  if (typeof billions !== 'number' || !(billions > 0)) {
    return LADDER.length - 1;
  }

  if (billions < SMALL_MODEL_BILLIONS) {
    return 0;
  }

  return billions < LARGE_MODEL_BILLIONS ? 1 : 2;
}

/**
 * Orçamento de trechos para o modelo. Janela desconhecida (ou 0) usa o médio; tamanho desconhecido
 * não limita (modelos na nuvem não informam o tamanho).
 */
export function contextBudget(
  windowTokens?: number | null,
  billions?: number | null,
): ContextBudget {
  return LADDER[Math.min(rungByWindow(windowTokens), rungBySize(billions))];
}

/** Tokens que o contexto das páginas pode somar a um envio (no pior caso), para o aviso de conversa grande. */
export function contextOverheadTokens(
  windowTokens?: number | null,
  billions?: number | null,
): number {
  return (
    CONTEXT_INSTRUCTION_TOKENS +
    Math.ceil(contextBudget(windowTokens, billions).maxChars / CHARS_PER_TOKEN)
  );
}
