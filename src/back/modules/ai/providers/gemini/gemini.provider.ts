import { Injectable } from '@nestjs/common';

import { type GenerateContentResponse, GoogleGenAI } from '@google/genai';

import type { AIChatRequest, AIProvider, AIProviderModel, AIThinkingOption } from '../../ai.model';

import { HealthCheck, HealthStatusOptions } from '../../../health/health.model';

import { IpcError, IpcErrorCode } from '../../../../../shared/errors';
import { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';

import { defaultSleep, raceAbort, withRetry } from '../../../../utils/retry';

import {
  classifyGeminiError,
  GEMINI_MAX_ATTEMPTS,
  GEMINI_RETRY_DELAYS_MS,
  GeminiEmptyResponseError,
} from './gemini-errors';
import { cheapestModel, modelsByCost, pricing } from './gemini.pricing';

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

  /**
   * Pede a resposta ao modelo escolhido. Se ele continuar fora do ar depois das tentativas
   * (sobrecarga, limite, rede), troca uma vez para o modelo mais barato e avisa quem chamou.
   */
  private async generateWithFallback(
    ai: GoogleGenAI,
    model: string,
    request: AIChatRequest,
  ): Promise<{ response: GenerateContentResponse; usedModel: string }> {
    try {
      return { response: await this.generate(ai, model, request), usedModel: model };
    } catch (error) {
      const fallbackModel = cheapestModel();
      const { retryable, message } = classifyGeminiError(error);

      // só troca entre modelos conhecidos, por erro passageiro e se o usuário não cancelou
      if (!retryable || request.signal?.aborted || !pricing.has(model) || model === fallbackModel) {
        throw error;
      }

      request.onRetry?.({
        attempt: 1,
        maxAttempts: GEMINI_MAX_ATTEMPTS,
        delayMs: 0,
        reason: message,
        fallback: true,
      });

      return {
        response: await this.generate(ai, fallbackModel, request),
        usedModel: fallbackModel,
      };
    }
  }

  private generate(
    ai: GoogleGenAI,
    model: string,
    request: AIChatRequest,
  ): Promise<GenerateContentResponse> {
    // Erro passageiro (limite de uso, servidor ocupado, rede, resposta vazia) repete sozinho,
    // até `GEMINI_MAX_ATTEMPTS` vezes, e avisa quem chamou antes de cada nova tentativa.
    return withRetry(
      async () => {
        const result = await ai.models.generateContent({
          model,
          contents: request.messages
            ? request.messages.map((turn) => ({
                role: turn.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: turn.content }],
              }))
            : request.message,
          // Modo JSON: a resposta já vem como JSON puro, sem cerca de código nem texto em volta.
          ...(request.json || request.signal
            ? {
                config: {
                  ...(request.json ? { responseMimeType: 'application/json' } : {}),
                  ...(request.signal ? { abortSignal: request.signal } : {}),
                },
              }
            : {}),
        });

        if (!result.text) {
          throw new GeminiEmptyResponseError();
        }

        return result;
      },
      {
        maxAttempts: GEMINI_MAX_ATTEMPTS,
        delaysMs: GEMINI_RETRY_DELAYS_MS,
        // cancelado: não repete nem espera a próxima tentativa
        isRetryable: (error) => !request.signal?.aborted && classifyGeminiError(error).retryable,
        sleep: (ms) =>
          request.signal ? raceAbort(this.sleep(ms), request.signal) : this.sleep(ms),
        onRetry: ({ attempt, maxAttempts, delayMs, error }) =>
          request.onRetry?.({
            attempt,
            maxAttempts,
            delayMs,
            reason: classifyGeminiError(error).message,
          }),
      },
    );
  }

  async chat(request: AIChatRequest): Promise<string> {
    const model = this.normalizeModel(request.model);
    const startedAt = Date.now();
    let ai: GoogleGenAI;

    try {
      ai = this.client();
    } catch (error) {
      // sem chave (ou cliente indisponível): a falha também aparece em Consumo
      this.usageService.recordFailure({
        provider: 'gemini',
        model,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Falha ao preparar o provedor.',
      });

      throw error;
    }

    try {
      const { response, usedModel } = await this.generateWithFallback(ai, model, request);

      const latencyMs = Date.now() - startedAt;

      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const totalTokens = response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

      const estimatedCost = this.calculateCost(usedModel, inputTokens, outputTokens);

      this.usageService.record({
        provider: 'gemini',
        model: usedModel,
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
      // O motivo real (limite de uso, servidor ocupado, chave recusada...) vai na mensagem, também
      // guardada em Consumo; o erro original fica em `cause`.
      const { message } = classifyGeminiError(error);

      this.usageService.recordFailure({
        provider: 'gemini',
        model,
        latencyMs: Date.now() - startedAt,
        error: message,
      });

      throw new Error(message, { cause: error });
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

      const order = modelsByCost();

      return result.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
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
