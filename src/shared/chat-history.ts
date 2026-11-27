import { SMALL_MODEL_BILLIONS, LARGE_MODEL_BILLIONS } from './rag-budget';
import { estimateConversationTokens } from './tokens';

/** Mensagens mais recentes que nunca entram no resumo (o modelo as lê por inteiro). */
export const KEEP_RECENT_MESSAGES = 4;

/** Orçamento do histórico quando nada se sabe do modelo. */
const UNKNOWN_WINDOW_HISTORY_TOKENS = 8_000;
/** Fração da janela de contexto que o histórico pode ocupar antes de virar resumo. */
const HISTORY_WINDOW_RATIO = 0.3;
const SMALL_MODEL_HISTORY_TOKENS = 3_000;
const MEDIUM_MODEL_HISTORY_TOKENS = 6_000;
const MIN_HISTORY_TOKENS = 1_500;

/** Resumo do começo de uma conversa: vale para as `upTo` primeiras mensagens do chat. */
export interface ChatDigest {
  text: string;
  /** Quantas mensagens do começo do chat o resumo cobre. */
  upTo: number;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Quantos tokens do histórico vão ao modelo sem virar resumo. Janela curta e modelo pequeno recebem
 * menos (se perdem com conversa longa); modelo na nuvem, grande e de janela longa, quase nunca resume.
 */
export function historyBudget(contextLimit?: number | null, billions?: number | null): number {
  const byWindow =
    typeof contextLimit === 'number' && contextLimit > 0
      ? Math.floor(contextLimit * HISTORY_WINDOW_RATIO)
      : UNKNOWN_WINDOW_HISTORY_TOKENS;
  let bySize = Number.POSITIVE_INFINITY;

  if (typeof billions === 'number' && billions > 0) {
    if (billions < SMALL_MODEL_BILLIONS) {
      bySize = SMALL_MODEL_HISTORY_TOKENS;
    } else if (billions < LARGE_MODEL_BILLIONS) {
      bySize = MEDIUM_MODEL_HISTORY_TOKENS;
    }
  }

  return Math.max(MIN_HISTORY_TOKENS, Math.min(byWindow, bySize));
}

/** O que ainda vai por inteiro ao modelo: as mensagens que o resumo não cobre. */
export function unsummarized<T>(messages: readonly T[], digest?: ChatDigest | null): T[] {
  return messages.slice(Math.min(digest?.upTo ?? 0, messages.length));
}

/**
 * Até onde resumir (índice da primeira mensagem que fica por inteiro), ou `null` se o histórico
 * ainda cabe no orçamento. O corte sempre cai no começo de uma pergunta do usuário.
 */
export function summaryCut(
  messages: readonly Turn[],
  digest: ChatDigest | null | undefined,
  budgetTokens: number,
): number | null {
  const covered = Math.min(digest?.upTo ?? 0, messages.length);
  const digestTokens = digest ? estimateConversationTokens([{ content: digest.text }]) : 0;

  if (estimateConversationTokens(messages.slice(covered)) + digestTokens <= budgetTokens) {
    return null;
  }

  let cut = messages.length - KEEP_RECENT_MESSAGES;

  while (cut < messages.length && messages[cut]?.role !== 'user') {
    cut += 1;
  }

  return cut > covered && cut < messages.length ? cut : null;
}

/** Tokens estimados do que vai ao modelo como histórico: o resumo (se houver), o resto e o rascunho. */
export function historyTokens(
  messages: ReadonlyArray<{ content: string }>,
  digest?: ChatDigest | null,
  draft = '',
): number {
  return (
    estimateConversationTokens(unsummarized(messages, digest), draft) +
    (digest ? estimateConversationTokens([{ content: digest.text }]) : 0)
  );
}
