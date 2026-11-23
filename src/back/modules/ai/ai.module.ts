import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AI_PROVIDERS } from './ai-providers.token';
import { AIService } from './ai.service';
import { AiUsageService } from './usage/ai-usage.service';

import { PromptService } from './prompts/prompt.service';
import { PromptStore } from './prompts/prompt.store';
import type { AIProvider } from './ai.model';
import { OllamaProvider } from './providers/ollama/ollama.provider';
import { GeminiProvider } from './providers/gemini/gemini.provider';
import { AnthropicProvider } from './providers/anthropic/anthropic.provider';

/** Providers de IA do app. Um provider novo entra só aqui (e no `EXTERNAL_PROVIDER_IDS`, se for externo). */
const PROVIDER_CLASSES = [OllamaProvider, GeminiProvider, AnthropicProvider];

/**
 * Providers de IA e uso. É o único módulo que declara `AIService`, `AiUsageService` e os providers:
 * os demais o importam, então há uma só instância de cada (o `usage` em memória é um só).
 */
@Module({
  imports: [HttpModule],
  providers: [
    AIService,
    AiUsageService,
    PromptStore,
    PromptService,
    ...PROVIDER_CLASSES,
    {
      provide: AI_PROVIDERS,
      useFactory: (...providers: AIProvider[]) => providers,
      inject: PROVIDER_CLASSES,
    },
  ],
  exports: [AIService, AiUsageService, PromptStore, PromptService],
})
export class AIModule {}
