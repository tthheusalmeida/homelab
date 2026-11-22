import type { PromptKind } from '../../../../shared/contracts/prompts';

import { DEFAULT_MIND_MAP_INSTRUCTIONS } from './mind-map.prompt';

/** O que a tela mostra de cada prompt personalizável e o texto padrão (as instruções, sem o contrato). */
export interface PromptDefinition {
  label: string;
  description: string;
  defaultText: string;
}

/**
 * Prompts que o usuário pode personalizar. O padrão fica no código (assim melhora com as versões do
 * app); o que o usuário muda fica em disco (`PromptStore`). Só as instruções entram aqui: o contrato
 * (formato da resposta, limites, segurança) é de cada `*.prompt.ts` e não é editável.
 */
export const PROMPT_CATALOG: Record<PromptKind, PromptDefinition> = {
  mindMap: {
    label: 'Mapa mental',
    description: 'Como a IA monta o mapa mental de revisão de um resumo.',
    defaultText: DEFAULT_MIND_MAP_INSTRUCTIONS,
  },
};
