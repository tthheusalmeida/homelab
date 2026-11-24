import type { AiProviderProfile } from './types';

/** Ollama roda no computador do usuário: sem logo, sem chave e nada sai da máquina. */
export const ollamaProfile: AiProviderProfile = {
  id: 'ollama',
  name: 'Ollama',
  company: 'Ollama',
  hint: 'Modelos de linguagem locais.',
};
