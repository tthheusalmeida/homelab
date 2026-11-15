import type { SettingsData } from '../shared/contracts/settings';

/**
 * Chaves que os services do back pedem ao `AppConfig` (mesmos nomes do antigo `.env`).
 * O back não é alterado, então este mapa é o contrato entre os dois lados.
 */
export const BackendConfigKey = {
  LIB_DIR: 'LIB_DIR',
  TEMP_DOCS_DIR: 'TEMP_DOCS_DIR',
  TEMP_VIDEO_DIR: 'TEMP_VIDEO_DIR',
  TEMP_AUDIO_DIR: 'TEMP_AUDIO_DIR',
  WHISPER_DIR: 'WHISPER_DIR',
  WHISPER_EXECUTABLE: 'WHISPER_EXECUTABLE',
  WHISPER_MODEL: 'WHISPER_MODEL',
  OLLAMA_URL: 'OLLAMA_URL',
  CORS_ORIGIN: 'CORS_ORIGIN',
} as const;

export const BackendConfigMessages = {
  unknownKey: (key: string) => `Configuração desconhecida pedida pelo back: ${key}`,
} as const;

/**
 * Implementa o `AppConfig` do back lendo do `SettingsStore` em vez de `process.env`.
 * O back lê estes valores uma única vez, ao criar os services; por isso mudar
 * configurações só vale depois de reiniciar o app.
 */
export class DesktopAppConfig {
  constructor(
    private readonly settings: SettingsData,
    private readonly corsOrigin: string,
  ) {}

  get(key: string): string {
    const { paths, local } = this.settings;

    switch (key) {
      case BackendConfigKey.LIB_DIR:
        return paths.libraryDir;
      case BackendConfigKey.TEMP_DOCS_DIR:
        return paths.inboxDir;
      case BackendConfigKey.TEMP_VIDEO_DIR:
        return paths.videoTempDir;
      case BackendConfigKey.TEMP_AUDIO_DIR:
        return paths.audioTempDir;
      case BackendConfigKey.WHISPER_DIR:
        return local.whisper.directory;
      case BackendConfigKey.WHISPER_EXECUTABLE:
        return local.whisper.executable;
      case BackendConfigKey.WHISPER_MODEL:
        return local.whisper.model;
      case BackendConfigKey.OLLAMA_URL:
        return local.ollama.url;
      case BackendConfigKey.CORS_ORIGIN:
        return this.corsOrigin;
      default:
        throw new Error(BackendConfigMessages.unknownKey(key));
    }
  }
}
