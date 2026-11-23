import { AIService } from '../modules/ai/ai.service';
import { DefaultAiService } from '../modules/ai/default-ai.service';
import { cheapestModel } from '../modules/ai/providers/gemini/gemini.pricing';
import type { BackConfig } from '../config/back-config';
import type { AiPreference } from '../../shared/contracts/ai';

/**
 * `DefaultAiService` de verdade para os testes dos serviços da biblioteca: sem padrão salvo, o
 * Gemini tem chave e o modelo mais barato é o do catálogo dele (o comportamento de antes).
 */
export function createTestDefaultAi(configured: AiPreference | null = null): DefaultAiService {
  const ai = {
    cheapestModel: (provider: string) => (provider === 'gemini' ? cheapestModel() : undefined),
  };
  const config = { defaultAi: () => configured, apiKeyFor: () => 'chave' };

  return new DefaultAiService(ai as unknown as AIService, config as unknown as BackConfig);
}
