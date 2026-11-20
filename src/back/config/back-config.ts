import type { PlatformTools } from '../modules/video/platform-downloader';

/**
 * Configuração que os services do back precisam, já tipada (substitui o `AppConfig` do `.env`).
 * É a ponte entre o back e o Settings/Secrets do desktop (ver `settings/settings-back-config.ts`);
 * nos testes basta passar um objeto com os campos usados.
 *
 * Os services leem os valores **uma vez**, ao serem criados; mudar configuração exige reiniciar o app.
 */
export abstract class BackConfig {
  /** Pasta da biblioteca (documentos publicados e arquivados). */
  abstract readonly libraryDir: string;

  /** Pasta de entrada (documentos pendentes gerados pelos jobs). */
  abstract readonly inboxDir: string;

  abstract readonly videoTempDir: string;

  abstract readonly audioTempDir: string;

  /** Executável do ffmpeg (embutido ou `ffmpeg` do PATH); sem valor, usa o do PATH. */
  ffmpegPath?(): string | undefined;

  /** yt-dlp e cookies de login para baixar vídeos de plataformas; sem valor, só links diretos. */
  readonly platformTools?: PlatformTools;

  abstract readonly ollamaUrl: string;

  /** Arquivo onde o consumo de IA fica guardado entre execuções; `null` guarda só em memória (testes). */
  abstract readonly usageFile: string | null;

  /** Arquivo do histórico de jobs; `null` guarda só em memória (testes). */
  abstract readonly jobsFile: string | null;

  /** Arquivo das conversas do chat; `null` guarda só em memória (testes). */
  abstract readonly chatsFile: string | null;

  /** Arquivo dos mapas mentais gerados pela IA; sem valor, ficam só em memória (testes). */
  abstract readonly mindMapsFile: string | null;

  /** Arquivo dos infográficos gerados pela IA; sem valor, ficam só em memória (testes). */
  abstract readonly infographicsFile: string | null;

  /** Chave do Gemini; `null` quando não configurada (o provider responde `NOT_CONFIGURED`). */
  abstract readonly geminiApiKey: string | null;
}
