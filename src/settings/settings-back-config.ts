import { BackConfig } from '../back/config/back-config';

import type { PlatformTools } from '../back/modules/video/platform-downloader';

import type { AppPaths } from './app-paths';
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
    readonly geminiApiKey: string | null,
    /** Caminho do ffmpeg, ou quem o resolve a cada uso (assim um ffmpeg recém-instalado vale sem reiniciar). */
    private readonly ffmpeg?: string | (() => string),
    readonly platformTools?: PlatformTools,
  ) {
    super();
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

  get chatsFile(): string {
    return this.appPaths.chatsFile;
  }

  get ollamaUrl(): string {
    return this.settings.get().local.ollama.url;
  }
}
