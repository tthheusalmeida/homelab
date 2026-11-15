/**
 * Estimativa de tokens, **sem tokenizador**: cerca de 4 caracteres por token em texto comum. Serve
 * para avisar o usuário que a conversa está grande e para dimensionar o contexto do Ollama; é uma
 * estimativa e sempre aparece rotulada assim.
 */
export const CHARS_PER_TOKEN = 4;

/** Acima desta fração do limite do modelo, o app avisa antes de enviar. */
export const CONTEXT_WARN_RATIO = 0.8;

/** Quando o limite do modelo é desconhecido, avisa a partir deste tamanho estimado. */
export const CONTEXT_WARN_FALLBACK_TOKENS = 100_000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Tokens estimados do histórico mais o texto que está para ser enviado. */
export function estimateConversationTokens(
  messages: ReadonlyArray<{ content: string }>,
  draft = '',
): number {
  return (
    messages.reduce((total, message) => total + estimateTokens(message.content), 0) +
    estimateTokens(draft)
  );
}

export interface ContextCheck {
  estimatedTokens: number;
  /** Limite de entrada do modelo, ou `null` se não se sabe. */
  limit: number | null;
  /** Fração do limite já usada, ou `null` sem limite conhecido. */
  ratio: number | null;
  shouldWarn: boolean;
}

/** Decide se o contexto estimado merece um aviso antes do envio. */
export function checkContext(estimatedTokens: number, limit?: number | null): ContextCheck {
  const known = typeof limit === 'number' && limit > 0 ? limit : null;

  if (known === null) {
    return {
      estimatedTokens,
      limit: null,
      ratio: null,
      shouldWarn: estimatedTokens >= CONTEXT_WARN_FALLBACK_TOKENS,
    };
  }

  const ratio = estimatedTokens / known;

  return { estimatedTokens, limit: known, ratio, shouldWarn: ratio >= CONTEXT_WARN_RATIO };
}
