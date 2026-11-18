import { Injectable } from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';

import type { AIChatRequest, AIProvider, AIProviderModel, AIThinkingOption } from '../../ai.model';

import { HealthCheck, HealthStatusOptions } from '../../../health/health.model';

import { IpcError, IpcErrorCode } from '../../../../../shared/errors';
import { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';

import { defaultSleep, withRetry } from '../../../../utils/retry';

import {
  classifyGeminiError,
  GEMINI_MAX_ATTEMPTS,
  GEMINI_RETRY_DELAYS_MS,
  GeminiEmptyResponseError,
} from './gemini-errors';
import { pricing } from './gemini.pricing';

export const GEMINI_NOT_CONFIGURED =
  'Chave da API do Gemini não configurada. Abra Configurações e informe a chave.';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly ai: GoogleGenAI | null;
  readonly name = 'gemini' as const;

  /** Espera entre tentativas (os testes trocam por uma que não espera). */
  sleep: (ms: number) => Promise<void> = defaultSleep;

  constructor(
    private readonly usageService: AiUsageService,
    config: BackConfig,
  ) {
    const apiKey = config.geminiApiKey;

    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  /** Cliente da SDK; sem chave, cada uso responde `NOT_CONFIGURED` (o app abre normalmente). */
  private client(): GoogleGenAI {
    if (!this.ai) {
      throw new IpcError(IpcErrorCode.NOT_CONFIGURED, GEMINI_NOT_CONFIGURED);
    }

    return this.ai;
  }

  private normalizeModel(model: string): string {
    return model.startsWith('models/') ? model.replace(/^models\//, '') : model;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelPricing = pricing.get(model);

    if (!modelPricing) {
      return 0;
    }

    return (
      (inputTokens / 1_000_000) * modelPricing.inputPerMillionTokens +
      (outputTokens / 1_000_000) * modelPricing.outputPerMillionTokens
    );
  }

  async health(): Promise<HealthCheck> {
    if (!this.ai) {
      return {
        service: 'gemini',
        description: 'Google Gemini API',
        status: HealthStatusOptions.ERROR,
      };
    }

    try {
      await this.ai.models.list();

      return {
        service: 'gemini',
        description: 'Google Gemini API',
        status: HealthStatusOptions.OK,
      };
    } catch {
      return {
        service: 'gemini',
        description: 'Google Gemini API',
        status: HealthStatusOptions.ERROR,
      };
    }
  }

  async chat(request: AIChatRequest): Promise<string> {
    const ai = this.client();

    const model = this.normalizeModel(request.model);
    const startedAt = Date.now();

    try {
      // Erro passageiro (limite de uso, servidor ocupado, rede, resposta vazia) repete sozinho,
      // até `GEMINI_MAX_ATTEMPTS` vezes, e avisa quem chamou antes de cada nova tentativa.
      const response = await withRetry(
        async () => {
          const result = await ai.models.generateContent({
            model,
            contents: request.messages
              ? request.messages.map((turn) => ({
                  role: turn.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: turn.content }],
                }))
              : request.message,
          });

          if (!result.text) {
            throw new GeminiEmptyResponseError();
          }

          return result;
        },
        {
          maxAttempts: GEMINI_MAX_ATTEMPTS,
          delaysMs: GEMINI_RETRY_DELAYS_MS,
          isRetryable: (error) => classifyGeminiError(error).retryable,
          sleep: (ms) => this.sleep(ms),
          onRetry: ({ attempt, maxAttempts, delayMs, error }) =>
            request.onRetry?.({
              attempt,
              maxAttempts,
              delayMs,
              reason: classifyGeminiError(error).message,
            }),
        },
      );

      const latencyMs = Date.now() - startedAt;

      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const totalTokens = response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

      const estimatedCost = this.calculateCost(model, inputTokens, outputTokens);

      this.usageService.record({
        provider: 'gemini',
        model,
        operation: 'chat',
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        success: true,
      });

      return response.text as string;
    } catch (error) {
      this.usageService.record({
        provider: 'gemini',
        model,
        operation: 'chat',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startedAt,
        success: false,
      });

      // O motivo real (limite de uso, servidor ocupado, chave recusada...) vai na mensagem; o erro
      // original fica em `cause`.
      throw new Error(classifyGeminiError(error).message, { cause: error });
    }
  }

  async models(): Promise<AIProviderModel[]> {
    const ai = this.client();

    try {
      const result: AIProviderModel[] = [];

      for await (const model of await ai.models.list()) {
        const geminiModel = model;

        if (!geminiModel.name && !geminiModel.supportedActions?.includes('generateContent')) {
          continue;
        }

        const modelName = this.normalizeModel(geminiModel.name ?? '');

        if (!pricing.has(modelName)) {
          continue;
        }

        result.push({
          name: modelName,
          provider: 'gemini',
          model: modelName,
          size: 0,
          details: {
            family: 'gemini',
            families: ['gemini'],
            parameter_size: '',
            quantization_level: '',
            context_length: geminiModel.inputTokenLimit ?? 0,
            embedding_length: 0,
          },
          capabilities: geminiModel.supportedActions ?? [],
        });
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error('A requisição para listar modelos do Gemini falhou.', {
        cause: error,
      });
    }
  }

  async thinking(model: string): Promise<AIThinkingOption[]> {
    const ai = this.client();

    try {
      const normalizedModel = this.normalizeModel(model);

      const modelInfo = await ai.models.get({
        model: normalizedModel,
      });

      if (!modelInfo.thinking) {
        return [];
      }

      return [
        {
          id: 'off',
          label: 'Desativado',
        },
        {
          id: 'on',
          label: 'Ativado',
        },
      ];
    } catch (error) {
      throw new Error(`Não foi possível consultar as capacidades do modelo ${model} no Gemini.`, {
        cause: error,
      });
    }
  }
}
