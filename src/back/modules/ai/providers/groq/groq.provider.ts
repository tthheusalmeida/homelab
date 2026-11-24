import { Injectable } from '@nestjs/common';

import Groq from 'groq-sdk';

import type { AIChatRequest, AIProvider, AIProviderModel, AIThinkingOption } from '../../ai.model';

import { HealthCheck, HealthStatusOptions } from '../../../health/health.model';

import { IpcError, IpcErrorCode } from '../../../../../shared/errors';
import { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';

import { defaultSleep } from '../../../../utils/retry';
import { type ChatAnswer, type ChatBackend, runResilientChat } from '../shared/resilient-chat';

import {
  GROQ_MAX_ATTEMPTS,
  GROQ_RETRY_DELAYS_MS,
  GroqEmptyResponseError,
  classifyGroqError,
} from './groq-errors';
import { groqCatalog } from './groq.pricing';

export const GROQ_NOT_CONFIGURED =
  'Chave da API da Groq não configurada. Abra Configurações e informe a chave.';

/** Teto de saída por resposta: o menor limite entre os modelos cadastrados (16.384). */
const MAX_OUTPUT_TOKENS = 16_000;

/** O modo JSON da Groq exige a palavra "JSON" nas mensagens. */
const JSON_ONLY_INSTRUCTION =
  'Responda somente com JSON válido, sem texto antes ou depois e sem cerca de código.';

@Injectable()
export class GroqProvider implements AIProvider, ChatBackend {
  private readonly ai: Groq | null;
  readonly name = 'groq' as const;
  readonly label = 'Groq';
  readonly catalog = groqCatalog;
  readonly maxAttempts = GROQ_MAX_ATTEMPTS;
  readonly retryDelaysMs = GROQ_RETRY_DELAYS_MS;

  /** Espera entre tentativas (os testes trocam por uma que não espera). */
  sleep: (ms: number) => Promise<void> = defaultSleep;

  constructor(
    private readonly usageService: AiUsageService,
    config: BackConfig,
  ) {
    const apiKey = config.apiKeyFor('groq');

    // as tentativas são do app (com aviso ao job), não da SDK
    this.ai = apiKey ? new Groq({ apiKey, maxRetries: 0 }) : null;
  }

  /** Cliente da SDK; sem chave, cada uso responde `NOT_CONFIGURED` (o app abre normalmente). */
  private client(): Groq {
    if (!this.ai) {
      throw new IpcError(IpcErrorCode.NOT_CONFIGURED, GROQ_NOT_CONFIGURED);
    }

    return this.ai;
  }

  cheapestModel(): string {
    return this.catalog.cheapest();
  }

  normalizeModel(model: string): string {
    return model;
  }

  ensureReady(): void {
    this.client();
  }

  classify = classifyGroqError;

  async health(): Promise<HealthCheck> {
    const base = { service: 'groq', description: 'Groq API' };

    if (!this.ai) {
      return { ...base, status: HealthStatusOptions.ERROR };
    }

    try {
      await this.ai.models.list();

      return { ...base, status: HealthStatusOptions.OK };
    } catch {
      return { ...base, status: HealthStatusOptions.ERROR };
    }
  }

  /** Uma tentativa à Groq (as repetições e a troca de modelo são de `runResilientChat`). */
  async attempt(model: string, request: AIChatRequest): Promise<ChatAnswer> {
    const turns = request.messages
      ? request.messages.map((turn) => ({ role: turn.role, content: turn.content }))
      : [{ role: 'user' as const, content: request.message }];
    const messages = request.json
      ? [{ role: 'system' as const, content: JSON_ONLY_INSTRUCTION }, ...turns]
      : turns;

    const response = await this.client().chat.completions.create(
      {
        model,
        messages,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        ...(request.json ? { response_format: { type: 'json_object' as const } } : {}),
      },
      request.signal ? { signal: request.signal } : undefined,
    );

    const text = response.choices[0]?.message?.content ?? '';

    if (!text) {
      throw new GroqEmptyResponseError();
    }

    return {
      text,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens,
    };
  }

  chat(request: AIChatRequest): Promise<string> {
    return runResilientChat(this, this.usageService, request);
  }

  async models(): Promise<AIProviderModel[]> {
    const ai = this.client();

    try {
      const { data } = await ai.models.list();

      return data
        .filter((model) => this.catalog.has(model.id))
        .map((model) => ({
          name: model.id,
          provider: 'groq' as const,
          model: model.id,
          size: 0,
          details: {
            family: model.owned_by,
            families: [model.owned_by],
            parameter_size: '',
            quantization_level: '',
            context_length: 0,
            embedding_length: 0,
          },
          capabilities: [],
        }))
        .sort((a, b) => this.catalog.rank(a.name) - this.catalog.rank(b.name));
    } catch (error) {
      throw new Error('A requisição para listar modelos da Groq falhou.', { cause: error });
    }
  }

  /** O app não liga o raciocínio: cada modelo usa o seu comportamento padrão. */
  thinking(): Promise<AIThinkingOption[]> {
    return Promise.resolve([]);
  }
}
