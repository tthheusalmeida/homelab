import type { AIRetryInfo } from '../../ai/ai.model';

/** Texto que o job mostra enquanto o provedor de IA tenta de novo. */
export function retryNote(info: AIRetryInfo): string {
  if (info.fallback) {
    return `Trocando para o modelo mais barato: ${info.reason}`;
  }

  return `Tentando de novo (tentativa ${info.attempt} de ${info.maxAttempts}): ${info.reason}`;
}
