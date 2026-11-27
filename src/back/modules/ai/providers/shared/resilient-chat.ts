import type { AIChatRequest, AIProviderName } from '../../ai.model';
import { AiUsageService } from '../../usage/ai-usage.service';

import { raceAbort, withRetry } from '../../../../utils/retry';

import type { ModelCatalog } from './model-catalog';
import type { ErrorInfo } from './status-error-classifier';

/** O que uma tentativa de chat devolve, na forma comum a todos os providers. */
export interface ChatAnswer {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Total informado pelo provider; sem ele vale entrada + saída. */
  totalTokens?: number;
}

/**
 * O que cada provider de IA na nuvem fornece para o fluxo comum de chat (`runResilientChat`):
 * só o que é específico da SDK dele. Tentativas, troca de modelo e consumo ficam no fluxo.
 */
export interface ChatBackend {
  readonly name: AIProviderName;
  readonly catalog: ModelCatalog;
  /** Quantas vezes tenta antes de desistir (contando a primeira). */
  readonly maxAttempts: number;
  /** Espera antes da 2ª tentativa, da 3ª... (a última vale para as que sobrarem). */
  readonly retryDelaysMs: number[];
  /** Espera de verdade; os testes trocam por uma que não espera. */
  sleep: (ms: number) => Promise<void>;
  /** Lança `NOT_CONFIGURED` se o provider não tem chave. */
  ensureReady(): void;
  /** Deixa o ID do modelo na forma que o provider usa. */
  normalizeModel(model: string): string;
  classify(error: unknown): ErrorInfo;
  /** Uma tentativa ao modelo dado; lança em qualquer falha (inclusive resposta vazia). */
  attempt(model: string, request: AIChatRequest): Promise<ChatAnswer>;
}

/** Se alguma tentativa já entregou texto à tela (compartilhado entre todas as tentativas de uma resposta). */
interface StreamState {
  emitted: boolean;
}

/**
 * O pedido de uma tentativa. Se uma tentativa anterior já entregou texto aos pedaços e falhou, as
 * seguintes **não** transmitem: o texto novo se somaria ao pedaço que já está na tela e repetiria o
 * começo. A resposta inteira chega no fim, como em qualquer outra chamada.
 */
function requestForAttempt(request: AIChatRequest, state: StreamState): AIChatRequest {
  const { onChunk } = request;

  if (!onChunk) {
    return request;
  }

  if (state.emitted) {
    return { ...request, onChunk: undefined };
  }

  return {
    ...request,
    onChunk: (text) => {
      state.emitted = true;
      onChunk(text);
    },
  };
}

/** Repete a tentativa em erro passageiro, avisando quem chamou antes de cada nova. */
function attemptWithRetry(
  backend: ChatBackend,
  model: string,
  request: AIChatRequest,
  state: StreamState,
): Promise<ChatAnswer> {
  return withRetry(() => backend.attempt(model, requestForAttempt(request, state)), {
    maxAttempts: backend.maxAttempts,
    delaysMs: backend.retryDelaysMs,
    // cancelado: não repete nem espera a próxima tentativa
    isRetryable: (error) => !request.signal?.aborted && backend.classify(error).retryable,
    sleep: (ms) =>
      request.signal ? raceAbort(backend.sleep(ms), request.signal) : backend.sleep(ms),
    onRetry: ({ attempt, maxAttempts, delayMs, error }) =>
      request.onRetry?.({
        attempt,
        maxAttempts,
        delayMs,
        reason: backend.classify(error).message,
      }),
  });
}

/**
 * Pede a resposta ao modelo escolhido. Se ele continuar fora do ar depois das tentativas
 * (sobrecarga, limite, rede), troca **uma vez** para o modelo mais barato do catálogo e avisa quem
 * chamou. Não troca se o erro não é passageiro, se o usuário cancelou, se o modelo não é do
 * catálogo ou se ele já é o mais barato.
 */
async function answerWithFallback(
  backend: ChatBackend,
  model: string,
  request: AIChatRequest,
  state: StreamState,
): Promise<{ answer: ChatAnswer; usedModel: string }> {
  try {
    return { answer: await attemptWithRetry(backend, model, request, state), usedModel: model };
  } catch (error) {
    const fallbackModel = backend.catalog.cheapest();
    const { retryable, message } = backend.classify(error);

    if (
      !retryable ||
      request.signal?.aborted ||
      !backend.catalog.has(model) ||
      backend.catalog.rank(model) === backend.catalog.rank(fallbackModel)
    ) {
      throw error;
    }

    request.onRetry?.({
      attempt: 1,
      maxAttempts: backend.maxAttempts,
      delayMs: 0,
      reason: message,
      fallback: true,
    });

    return {
      answer: await attemptWithRetry(backend, fallbackModel, request, state),
      usedModel: fallbackModel,
    };
  }
}

/**
 * Fluxo de chat comum aos providers de IA na nuvem: confere a chave, tenta (com repetição e troca
 * para o modelo mais barato), calcula o custo e registra o consumo, com sucesso ou falha. O erro que
 * sobe traz o motivo em português; o original fica em `cause`.
 */
export async function runResilientChat(
  backend: ChatBackend,
  usage: AiUsageService,
  request: AIChatRequest,
): Promise<string> {
  const model = backend.normalizeModel(request.model);
  const startedAt = Date.now();

  try {
    backend.ensureReady();
  } catch (error) {
    // sem chave: a falha também aparece em Consumo
    usage.recordFailure({
      provider: backend.name,
      model,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Falha ao preparar o provedor.',
    });

    throw error;
  }

  try {
    const { answer, usedModel } = await answerWithFallback(backend, model, request, {
      emitted: false,
    });
    const { inputTokens, outputTokens } = answer;

    usage.record({
      provider: backend.name,
      model: usedModel,
      operation: 'chat',
      inputTokens,
      outputTokens,
      totalTokens: answer.totalTokens ?? inputTokens + outputTokens,
      estimatedCost: backend.catalog.cost(usedModel, inputTokens, outputTokens),
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return answer.text;
  } catch (error) {
    const { message } = backend.classify(error);

    usage.recordFailure({
      provider: backend.name,
      model,
      latencyMs: Date.now() - startedAt,
      error: message,
    });

    throw new Error(message, { cause: error });
  }
}
