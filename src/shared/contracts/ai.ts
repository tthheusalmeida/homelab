import { EXTERNAL_PROVIDER_IDS } from './providers';

/** Todos os providers de IA: o local (Ollama) e os externos (`EXTERNAL_PROVIDER_IDS`). */
export const AI_PROVIDER_IDS = ['ollama', ...EXTERNAL_PROVIDER_IDS] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

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
