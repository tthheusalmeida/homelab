import { AI_PROVIDER_IDS, type AiProviderId } from '#shared/contracts/ai';

import { anthropicProfile } from './ai-providers/anthropic';
import { geminiProfile } from './ai-providers/gemini';
import { groqProfile } from './ai-providers/groq';
import { ollamaProfile } from './ai-providers/ollama';
import type { AiProviderProfile } from './ai-providers/types';

export type { AiProviderProfile, KeyGuideStep } from './ai-providers/types';

/**
 * Perfil de cada provider de IA. É um `Record` por id: ao entrar um id novo em
 * `AI_PROVIDER_IDS`, o compilador exige o perfil dele aqui.
 */
export const AI_PROVIDER_PROFILES: Record<AiProviderId, AiProviderProfile> = {
  ollama: ollamaProfile,
  gemini: geminiProfile,
  anthropic: anthropicProfile,
  groq: groqProfile,
};

/** Perfis na ordem de `AI_PROVIDER_IDS` (a ordem dos botões e das listas). */
export const AI_PROVIDER_LIST: readonly AiProviderProfile[] = AI_PROVIDER_IDS.map(
  (id) => AI_PROVIDER_PROFILES[id],
);

/** Perfil do provider, ou `undefined` para um id desconhecido (ex.: de uma versão futura). */
export function profileOf(id: string | undefined): AiProviderProfile | undefined {
  return AI_PROVIDER_LIST.find((profile) => profile.id === id);
}

/** O texto sai do computador para esse provider (serviço na nuvem)? */
export function sendsOffDevice(id: string | undefined): boolean {
  return Boolean(profileOf(id)?.sentTo);
}

/** Perfis dos serviços que informam onde ver o consumo real. */
export const AI_PROVIDERS_WITH_CONSOLE = AI_PROVIDER_LIST.filter((profile) => profile.console);
