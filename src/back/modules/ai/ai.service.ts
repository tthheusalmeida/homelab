import { Injectable } from '@nestjs/common';

import type {
  AIProvider,
  AIProviderModel,
  AIProviderName,
  AIProviderInfo,
  AIThinkingOption,
} from './ai.model';

import { OllamaProvider } from './providers/ollama/ollama.provider';
import { GeminiProvider } from './providers/gemini/gemini.provider';

import { AiChatDto } from './dto/ai-chat.dto';

import { HealthCheck } from '../health/health.model';

@Injectable()
export class AIService {
  private readonly providers: Map<AIProviderName, AIProvider>;

  constructor(ollamaProvider: OllamaProvider, geminiProvider: GeminiProvider) {
    this.providers = new Map<AIProviderName, AIProvider>([
      ['ollama', ollamaProvider],
      ['gemini', geminiProvider],
    ]);
  }

  providersList(): AIProviderInfo[] {
    const providerNames: Record<AIProviderName, string> = {
      ollama: 'Ollama',
      gemini: 'Gemini',
    };

    return Array.from(this.providers.keys()).map((id) => ({
      id,
      label: providerNames[id],
    }));
  }

  async health(): Promise<HealthCheck[]> {
    return Promise.all([...this.providers.values()].map((provider) => provider.health()));
  }

  async models(provider?: AIProviderName): Promise<AIProviderModel[]> {
    if (provider) {
      const response = await this.getProvider(provider).models();

      return response.map((model) => {
        const name = String(model.name);

        return {
          ...model,
          id: name,
          label: name.replace(
            /(^|-)([a-z0-9])/g,
            (_, sep: string, c: string) => (sep ? ' ' : '') + c.toUpperCase(),
          ),
        };
      });
    }

    const models = await Promise.all(
      [...this.providers.values()].map((provider) => provider.models()),
    );

    return models.flat();
  }

  async thinking(providerName: AIProviderName, modelName: string): Promise<AIThinkingOption[]> {
    const response = await this.getProvider(providerName).thinking(modelName);

    return response;
  }

  async chat(dto: AiChatDto): Promise<string> {
    const provider = this.getProvider(dto.providerId);

    return provider.chat({
      message: dto.message,
      model: dto.modelId,
      thinking: dto.thinking,
      ...(dto.json ? { json: true } : {}),
      ...(dto.messages ? { messages: dto.messages } : {}),
      ...(dto.onRetry ? { onRetry: dto.onRetry } : {}),
    });
  }

  private getProvider(name: AIProviderName): AIProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(`Provider de IA não suportado: ${name}`);
    }

    return provider;
  }
}
