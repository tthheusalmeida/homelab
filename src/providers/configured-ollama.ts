import type { LocalAssistant } from '../back/config/local-assistant';

import type { PingFetch } from './ollama-runtime';

export const ConfiguredOllamaMessages = {
  unreachable: (url: string) =>
    `Não consegui falar com o Ollama em ${url}. Deixe-o ligado (no terminal: ollama serve) ou confira o endereço em Configurações > Provedores locais.`,
} as const;

/** Tempo máximo esperando o Ollama responder antes de dizer que ele está desligado. */
const PING_TIMEOUT_MS = 3_000;

/**
 * O Ollama que o **próprio usuário** instalou e liga (no Linux, por exemplo): o app não o liga, só
 * confere que ele responde no endereço configurado e, aí, manda baixar os modelos nele.
 */
export class ConfiguredOllama implements LocalAssistant {
  constructor(
    private readonly url: () => string,
    private readonly ping: PingFetch,
  ) {}

  get baseUrl(): string {
    return this.url().replace(/\/+$/, '');
  }

  isInstalled(): boolean {
    return true;
  }

  async ensureRunning(): Promise<void> {
    try {
      const response = await this.ping(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // cai na mensagem abaixo
    }

    throw new Error(ConfiguredOllamaMessages.unreachable(this.baseUrl));
  }
}
