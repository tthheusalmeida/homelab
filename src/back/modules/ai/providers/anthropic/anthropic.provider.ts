import { Injectable } from '@nestjs/common';

import Anthropic from '@anthropic-ai/sdk';

import type { AIChatRequest, AIProvider, AIProviderModel, AIThinkingOption } from '../../ai.model';

import { HealthCheck, HealthStatusOptions } from '../../../health/health.model';

import { IpcError, IpcErrorCode } from '../../../../../shared/errors';
import { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';

import { defaultSleep } from '../../../../utils/retry';
import { type ChatAnswer, type ChatBackend, runResilientChat } from '../shared/resilient-chat';

import {
  ANTHROPIC_MAX_ATTEMPTS,
  ANTHROPIC_RETRY_DELAYS_MS,
  AnthropicEmptyResponseError,
  AnthropicRefusalError,
  classifyAnthropicError,
} from './anthropic-errors';
import { anthropicCatalog } from './anthropic.pricing';

export const ANTHROPIC_NOT_CONFIGURED =
  'Chave da API da Anthropic não configurada. Abra Configurações e informe a chave.';

/** Teto de saída por resposta (todos os modelos cadastrados aceitam); a resposta vem em stream. */
const MAX_OUTPUT_TOKENS = 32_000;

const JSON_ONLY_INSTRUCTION =
  'Responda somente com JSON válido, sem texto antes ou depois e sem cerca de código.';

@Injectable()
export class AnthropicProvider implements AIProvider, ChatBackend {
  private readonly ai: Anthropic | null;
  readonly name = 'anthropic' as const;
  readonly catalog = anthropicCatalog;
  readonly maxAttempts = ANTHROPIC_MAX_ATTEMPTS;
  readonly retryDelaysMs = ANTHROPIC_RETRY_DELAYS_MS;

  /** Espera entre tentativas (os testes trocam por uma que não espera). */
  sleep: (ms: number) => Promise<void> = defaultSleep;

  constructor(
    private readonly usageService: AiUsageService,
    config: BackConfig,
  ) {
    const apiKey = config.anthropicApiKey;

    // as tentativas são do app (com aviso ao job), não da SDK
    this.ai = apiKey ? new Anthropic({ apiKey, maxRetries: 0 }) : null;
  }

  /** Cliente da SDK; sem chave, cada uso responde `NOT_CONFIGURED` (o app abre normalmente). */
  private client(): Anthropic {
    if (!this.ai) {
      throw new IpcError(IpcErrorCode.NOT_CONFIGURED, ANTHROPIC_NOT_CONFIGURED);
    }

    return this.ai;
  }

  normalizeModel(model: string): string {
    return model;
  }

  ensureReady(): void {
    this.client();
  }

  classify = classifyAnthropicError;

  async health(): Promise<HealthCheck> {
    const base = { service: 'anthropic', description: 'Anthropic API' };

    if (!this.ai) {
      return { ...base, status: HealthStatusOptions.ERROR };
    }

    try {
      await this.ai.models.list({ limit: 1 });

      return { ...base, status: HealthStatusOptions.OK };
    } catch {
      return { ...base, status: HealthStatusOptions.ERROR };
    }
  }

  /** Uma tentativa à Anthropic (as repetições e a troca de modelo são de `runResilientChat`). */
  async attempt(model: string, request: AIChatRequest): Promise<ChatAnswer> {
    const messages: Anthropic.MessageParam[] = request.messages
      ? request.messages.map((turn) => ({ role: turn.role, content: turn.content }))
      : [{ role: 'user', content: request.message }];

    const response = await this.client()
      .messages.stream(
        {
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages,
          ...(request.json ? { system: JSON_ONLY_INSTRUCTION } : {}),
        },
        request.signal ? { signal: request.signal } : undefined,
      )
      .finalMessage();

    if (response.stop_reason === 'refusal') {
      throw new AnthropicRefusalError();
    }

    const text = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('');

    if (!text) {
      throw new AnthropicEmptyResponseError();
    }

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  chat(request: AIChatRequest): Promise<string> {
    return runResilientChat(this, this.usageService, request);
  }

  async models(): Promise<AIProviderModel[]> {
    const ai = this.client();

    try {
      const result: AIProviderModel[] = [];

      for await (const model of ai.models.list({ limit: 100 })) {
        if (!this.catalog.has(model.id)) {
          continue;
        }

        result.push({
          name: model.id,
          provider: 'anthropic',
          model: model.id,
          size: 0,
          details: {
            family: 'claude',
            families: ['claude'],
            parameter_size: '',
            quantization_level: '',
            context_length: model.max_input_tokens ?? 0,
            embedding_length: 0,
          },
          capabilities: [],
        });
      }

      return result.sort((a, b) => this.catalog.rank(a.name) - this.catalog.rank(b.name));
    } catch (error) {
      throw new Error('A requisição para listar modelos da Anthropic falhou.', {
        cause: error,
      });
    }
  }

  /** O app não liga o raciocínio estendido: cada modelo usa o seu comportamento padrão. */
  thinking(): Promise<AIThinkingOption[]> {
    return Promise.resolve([]);
  }
}
