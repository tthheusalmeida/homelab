import type { BackConfig } from '../../../../config/back-config';

/**
 * Liga o assistente local se é ele que está em uso (instalado pelo app e sem outro endereço
 * configurado). Com o Ollama do próprio usuário não faz nada. Compartilhado pelo provedor de chat e
 * pelos embeddings, que falam com o mesmo servidor.
 */
export async function prepareOllama(config: BackConfig): Promise<void> {
  const assistant = config.localAssistant?.();

  if (assistant?.isInstalled() && config.ollamaUrl === assistant.baseUrl) {
    await assistant.ensureRunning();
  }
}
