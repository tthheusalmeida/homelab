import type { AIRetryInfo } from '../../ai/ai.model';

/** Texto que o job mostra enquanto o provedor de IA tenta de novo. */
export function retryNote(info: AIRetryInfo): string {
  return `Tentando de novo (tentativa ${info.attempt} de ${info.maxAttempts}): ${info.reason}`;
}
