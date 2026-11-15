import { estimateTokens } from '../../../../../shared/tokens';

import type { AIChatTurn } from '../../ai.model';

/** Tamanhos de contexto oferecidos ao Ollama (`num_ctx`), do menor ao maior. */
export const CONTEXT_STEPS = [4096, 8192, 16384, 32768, 65536, 131072, 262144] as const;

/** Espaço reservado para a resposta, além do histórico. */
export const REPLY_HEADROOM_TOKENS = 1024;

/**
 * O Ollama usa um contexto pequeno por padrão e **descarta o começo da conversa sem avisar**. Para o
 * histórico valer, pede um `num_ctx` que caiba a conversa estimada mais a resposta: o menor degrau
 * suficiente, limitado ao máximo do modelo quando ele é conhecido (`modelLimit` > 0).
 */
export function chooseContextWindow(messages: AIChatTurn[], modelLimit: number): number {
  const needed =
    messages.reduce((total, turn) => total + estimateTokens(turn.content), 0) +
    REPLY_HEADROOM_TOKENS;
  const step = CONTEXT_STEPS.find((candidate) => candidate >= needed) ?? CONTEXT_STEPS.at(-1)!;

  return modelLimit > 0 ? Math.min(step, modelLimit) : step;
}

/** Lê o limite de contexto do modelo na resposta de `/api/show` (`model_info["<arquitetura>.context_length"]`). */
export function parseModelContextLimit(data: unknown): number {
  const info = (data as { model_info?: unknown } | null)?.model_info;

  if (typeof info !== 'object' || info === null) {
    return 0;
  }

  for (const [key, value] of Object.entries(info)) {
    if (key.endsWith('.context_length') && typeof value === 'number' && value > 0) {
      return value;
    }
  }

  return 0;
}
