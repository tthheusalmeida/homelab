import { EXTERNAL_PROVIDER_IDS } from './providers';

/** Todos os providers de IA: o local (Ollama) e os externos (`EXTERNAL_PROVIDER_IDS`). */
export const AI_PROVIDER_IDS = ['ollama', ...EXTERNAL_PROVIDER_IDS] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

/** A IA que vale para uma tarefa: provider e modelo já definidos. */
export interface AiChoice {
  providerId: AiProviderId;
  modelId: string;
}

/** Preferência guardada (padrão ou troca da sessão); `modelId` nulo = o mais barato do provider. */
export interface AiPreference {
  providerId: AiProviderId;
  modelId: string | null;
}

/** De onde vem a IA em uso: troca desta sessão, padrão salvo ou automática (a mais barata). */
export type AiChoiceSource = 'session' | 'default' | 'auto';

/** Estado da IA usada em mapa mental, infográfico e sugestão de título (canal `ai:selection`). */
export interface AiSelectionState {
  /** Padrão salvo em Configurações; `null` = automático. */
  configured: AiPreference | null;
  /** Troca temporária, só até fechar o app; `null` = nenhuma. */
  session: AiPreference | null;
  /** O que vale agora. */
  effective: AiChoice & { source: AiChoiceSource };
}

/** Define a IA padrão em Configurações (guardada em disco); `null` volta ao automático. */
export interface AiDefaultRequest {
  preference: AiPreference | null;
}

/** Troca a IA só nesta sessão do app; `null` volta ao padrão. */
export interface AiSessionRequest {
  preference: AiPreference | null;
}

export interface AiProviderEntry {
  id: AiProviderId;
  label: string;
}

export interface AiThinkingEntry {
  id: string;
  label: string;
}

export interface AiModelDetails {
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
  context_length: number;
  embedding_length: number;
}

export interface AiModelEntry {
  id: string;
  label: string;
  name: string;
  provider: AiProviderId;
  model: string;
  size: number;
  details: AiModelDetails;
  capabilities: string[];
  thinking?: AiThinkingEntry[];
}

export interface AiModelsRequest {
  providerId: AiProviderId;
}

export interface AiThinkingRequest {
  providerId: AiProviderId;
  modelId: string;
}

export interface AiUsageRequestFilter {
  provider?: AiProviderId;
}

interface AiUsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  averageLatencyMs: number;
}

export interface AiUsageSummary {
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  averageLatencyMs: number;
}

export interface AiProviderUsage extends AiUsageTotals {
  provider: AiProviderId;
}

export interface AiModelUsage extends AiUsageTotals {
  provider: AiProviderId;
  model: string;
}

export interface AiUsageTimeline {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AiUsageRecord {
  id: string;
  provider: AiProviderId;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  /** O motivo, quando a requisição falhou. */
  error?: string;
  createdAt: string;
}

/** Resposta de `ai:usage` (mesmo formato do `GET ai/usage` de hoje). */
export interface AiUsageReport {
  summary: AiUsageSummary;
  byProvider: AiProviderUsage[];
  byModel: AiModelUsage[];
  timeline: AiUsageTimeline[];
  recentRequests: AiUsageRecord[];
}
