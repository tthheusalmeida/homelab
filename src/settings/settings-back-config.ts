import { BackConfig } from '../back/config/back-config';
import type { LocalAssistant } from '../back/config/local-assistant';

import type { PlatformTools } from '../back/modules/video/platform-downloader';

import type { AiPreference } from '../shared/contracts/ai';
import type { ExternalProviderId } from '../shared/contracts/providers';
import type { ApiKeys } from './api-keys';
import type { AppPaths } from './app-paths';
import { DEFAULT_OLLAMA_URL } from './settings-defaults';
import type { SettingsStore } from './settings-store';

/**
 * `BackConfig` sobre o Settings do desktop: a biblioteca e a URL do Ollama vêm do `settings.json`
 * (valores atuais a cada leitura); inbox, temporários e arquivos de estado são fixos (`AppPaths`); e
 * a chave do Gemini vem dos segredos cifrados (lida uma vez, na inicialização, porque a decifragem é
 * assíncrona e o provider a usa ao ser criado).
 */
export class SettingsBackConfig extends BackConfig {
  constructor(
    private readonly settings: SettingsStore,
    private readonly appPaths: AppPaths,
    /** Chaves de API dos providers externos, lidas uma vez na inicialização. */
    private readonly apiKeys: ApiKeys,
    /** Caminho do ffmpeg, ou quem o resolve a cada uso (assim um ffmpeg recém-instalado vale sem reiniciar). */
    private readonly ffmpeg?: string | (() => string),
    readonly platformTools?: PlatformTools,
    /** O assistente local que o app instala e liga (opcional). */
    private readonly assistant?: LocalAssistant,
    /** Onde ficam os vetores da busca por sentido (cache; fora da pasta de backup). */
    readonly embeddingsFile: string | null = null,
  ) {
    super();
  }

  defaultAi(): AiPreference | null {
    return this.settings.get().ai.default;
  }

  apiKeyFor(provider: ExternalProviderId): string | null {
    return this.apiKeys[provider] ?? null;
  }

  ffmpegPath(): string | undefined {
    return typeof this.ffmpeg === 'function' ? this.ffmpeg() : this.ffmpeg;
  }

  get libraryDir(): string {
    return this.settings.get().paths.libraryDir;
  }

  get inboxDir(): string {
    return this.appPaths.inboxDir;
  }

  get videoTempDir(): string {
    return this.appPaths.videoTempDir;
  }

  get audioTempDir(): string {
    return this.appPaths.audioTempDir;
  }

  get pdfWorkDir(): string {
    return this.appPaths.pdfWorkDir;
  }

  get usageFile(): string {
    return this.appPaths.usageFile;
  }

  get jobsFile(): string {
    return this.appPaths.jobsFile;
  }

  get mindMapsFile(): string {
    return this.appPaths.mindMapsFile;
  }

  get infographicsFile(): string {
    return this.appPaths.infographicsFile;
  }

  get promptsFile(): string {
    return this.appPaths.promptsFile;
  }

  get chatsFile(): string {
    return this.appPaths.chatsFile;
  }

  localAssistant(): LocalAssistant | null {
    return this.assistant ?? null;
  }

  /**
   * O endereço configurado, exceto quando o assistente local está instalado e o usuário não escolheu
   * outro endereço: aí vale o do assistente. Quem aponta para outro Ollama continua com o seu.
   */
  get ollamaUrl(): string {
    const configured = this.settings.get().local.ollama.url;

    return this.assistant?.isInstalled() && configured === DEFAULT_OLLAMA_URL
      ? this.assistant.baseUrl
      : configured;
  }
}
