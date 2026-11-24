import type { SaveResult } from './settings';

export interface ProviderTestResult {
  ok: boolean;
  message: string;
}

/**
 * Providers externos (IAs na nuvem). A chave nunca volta em claro: só mascarada.
 * Esta lista é a fonte única dos ids: um provider novo começa aqui e o compilador aponta o resto.
 */
export const EXTERNAL_PROVIDER_IDS = ['gemini', 'anthropic', 'groq'] as const;
export type ExternalProviderId = (typeof EXTERNAL_PROVIDER_IDS)[number];

export interface ExternalProviderInfo {
  id: ExternalProviderId;
  label: string;
  configured: boolean;
  maskedKey: string | null;
}

export interface ExternalProviderSaveRequest {
  id: ExternalProviderId;
  apiKey: string;
}

export interface ExternalProviderTestRequest {
  id: ExternalProviderId;
  /** Chave a testar antes de salvar; sem ela, testa a chave já salva. */
  apiKey?: string;
}

/** Providers locais (rodam na máquina do usuário). */
export type LocalProviderId = 'whisper' | 'ollama' | 'ffmpeg';

export interface LocalProviderInfo {
  id: LocalProviderId;
  label: string;
  /** `false` quando o provider só pode ser testado (ex.: ffmpeg usa o PATH). */
  editable: boolean;
  config: Record<string, string>;
}

export interface LocalProviderSaveRequest {
  id: LocalProviderId;
  config: Record<string, string>;
}

export interface LocalProviderTestRequest {
  id: LocalProviderId;
  /** Configuração a testar antes de salvar; sem ela, testa a salva. */
  config?: Record<string, string>;
}

export type ExternalProviderSaveResult = SaveResult<ExternalProviderInfo>;
export type LocalProviderSaveResult = SaveResult<LocalProviderInfo>;
