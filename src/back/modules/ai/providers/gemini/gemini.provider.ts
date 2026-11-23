import { Injectable } from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';

import type { AIChatRequest, AIProvider, AIProviderModel, AIThinkingOption } from '../../ai.model';

import { HealthCheck, HealthStatusOptions } from '../../../health/health.model';

import { IpcError, IpcErrorCode } from '../../../../../shared/errors';
import { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';

import { defaultSleep } from '../../../../utils/retry';
import { type ChatAnswer, type ChatBackend, runResilientChat } from '../shared/resilient-chat';

import {
  classifyGeminiError,
  GEMINI_MAX_ATTEMPTS,
  GEMINI_RETRY_DELAYS_MS,
  GeminiEmptyResponseError,
} from './gemini-errors';
import { geminiCatalog } from './gemini.pricing';

export const GEMINI_NOT_CONFIGURED =
  'Chave da API do Gemini não configurada. Abra Configurações e informe a chave.';

@Injectable()
export class GeminiProvider implements AIProvider, ChatBackend {
  private readonly ai: GoogleGenAI | null;
  readonly name = 'gemini' as const;
  readonly label = 'Gemini';
  readonly catalog = geminiCatalog;
  readonly maxAttempts = GEMINI_MAX_ATTEMPTS;
  readonly retryDelaysMs = GEMINI_RETRY_DELAYS_MS;

  /** Espera entre tentativas (os testes trocam por uma que não espera). */
  sleep: (ms: number) => Promise<void> = defaultSleep;

  constructor(
    private readonly usageService: AiUsageService,
    config: BackConfig,
  ) {
    const apiKey = config.apiKeyFor('gemini');

    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  /** Cliente da SDK; sem chave, cada uso responde `NOT_CONFIGURED` (o app abre normalmente). */
  private client(): GoogleGenAI {
    if (!this.ai) {
      throw new IpcError(IpcErrorCode.NOT_CONFIGURED, GEMINI_NOT_CONFIGURED);
    }

    return this.ai;
  }

  normalizeModel(model: string): string {
    return model.startsWith('models/') ? model.replace(/^models\//, '') : model;
  }

  ensureReady(): void {
    this.client();
  }

  classify = classifyGeminiError;

  async health(): Promise<HealthCheck> {
    const base = { service: 'gemini', description: 'Google Gemini API' };

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

  /** Uma tentativa ao Gemini (as repetições e a troca de modelo são de `runResilientChat`). */
  async attempt(model: string, request: AIChatRequest): Promise<ChatAnswer> {
    const result = await this.client().models.generateContent({
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

    return {
      text: result.text,
      inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: result.usageMetadata?.totalTokenCount,
    };
  }

  chat(request: AIChatRequest): Promise<string> {
    return runResilientChat(this, this.usageService, request);
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

        if (!this.catalog.has(modelName)) {
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

      return result.sort((a, b) => this.catalog.rank(a.name) - this.catalog.rank(b.name));
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
