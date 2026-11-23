import * as fs from 'node:fs';
import * as path from 'node:path';

import { isAbortError } from '../../utils/exec-streaming';
import { onlyChanges, parseYtDlpPercent, type PercentListener } from '../../utils/progress';
import { isLoginPageUrl } from '../../../shared/media-url';

import { AccessRequiredError } from './access-required.error';

export const PlatformMessages = {
  notInstalled:
    'O download de vídeos de plataformas precisa do componente "Download de vídeos". Abra Configurações > Componentes, instale-o e tente de novo.',
  failed: (reason: string) => `Não foi possível baixar o vídeo desta plataforma. ${reason}`.trim(),
  noFile: 'O download terminou, mas o arquivo do vídeo não foi encontrado.',
  noVideoInPage:
    'Não encontrei nenhum vídeo nesta página. Abra o link no navegador e confira se o vídeo aparece para você.',
} as const;

/** Vídeos achados dentro de uma página (tags video/source e iframes), e se ela mandou para o login. */
export interface MediaScan {
  urls: string[];
  loginRequired: boolean;
}

/** Arquivo de cookies temporário (formato Netscape) que o yt-dlp lê; `cleanup` o apaga. */
export interface CookieFile {
  file: string;
  cleanup: () => Promise<void>;
}

/** O que o downloader precisa do desktop: onde está o yt-dlp e quais cookies usar para um endereço. */
export interface PlatformTools {
  /** Caminho do yt-dlp instalado, ou `null` quando o componente não está instalado. */
  ytDlpPath: () => string | null;
  /** Cookies das contas em que o usuário entrou pelo app (`null` quando não há nenhum). */
  cookiesFor: (url: string) => Promise<CookieFile | null>;
  /**
   * Navegador principal do usuário (nome que o yt-dlp entende: chrome, edge, firefox...), de onde
   * ler os logins já feitos; `null` quando não dá para saber.
   */
  browser?: () => Promise<string | null>;
  /**
   * Abre a página com os logins do app e procura o endereço do vídeo no HTML (para páginas de curso
   * como o Canvas, que o yt-dlp não reconhece).
   */
  findMedia?: (url: string) => Promise<MediaScan>;
}

export type RunProgram = (
  file: string,
  args: string[],
  /** Recebe o texto que o programa escreve enquanto roda (para acompanhar o download). */
  onText?: (text: string) => void,
  /** Cancela o programa (e os que ele abriu). */
  signal?: AbortSignal,
) => Promise<{ stdout: string; stderr: string }>;

export interface PlatformDownloaderDeps {
  tools?: PlatformTools;
  /** Caminho do ffmpeg embutido; `ffmpeg` (PATH) não é repassado ao yt-dlp. */
  ffmpegPath?: string;
  run: RunProgram;
}

/** Trechos da mensagem do yt-dlp que indicam vídeo privado ou que exige login (em minúsculas). */
const ACCESS_HINTS = [
  'sign in',
  'log in',
  'login required',
  'private video',
  'members-only',
  'members only',
  'http error 401',
  'http error 403',
  'requires authentication',
  'use --cookies',
  'confirm your age',
  'registered users',
];

/**
 * Páginas de curso (Canvas, Moodle etc.) mandam quem não entrou para uma tela de login, e o yt-dlp
 * reclama "Unsupported URL: <tela de login>". Se o endereço recusado parece login, é falta de acesso.
 */

function isUnsupportedLoginPage(text: string): boolean {
  const match = /unsupported url:\s*(\S+)/i.exec(text);

  return match !== null && isLoginPageUrl(match[1]);
}

/** O yt-dlp não conseguiu ler os cookies do navegador (banco travado, criptografia do Chrome). */
const COOKIE_READ_FAILURE = /could not (copy|find)|cookie database|decrypt|dpapi/i;

/** A falha do yt-dlp quer dizer "precisa de acesso" (e não "link quebrado" ou "site mudou")? */
export function isAccessFailure(message: string): boolean {
  const text = message.toLowerCase();

  return ACCESS_HINTS.some((hint) => text.includes(hint)) || isUnsupportedLoginPage(message);
}

/** Última linha `ERROR:` do yt-dlp, sem o prefixo, para mostrar ao usuário. */
export function lastErrorLine(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('ERROR:'));

  return (lines.at(-1) ?? '').replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '');
}

function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const { stderr, message } = error as { stderr?: unknown; message?: unknown };

    return [stderr, message].filter((part) => typeof part === 'string').join('\n');
  }

  return String(error);
}

/**
 * Baixa o áudio de um vídeo de qualquer plataforma que o yt-dlp suporte (YouTube, Vimeo etc.). Só o
 * áudio, que é o que a transcrição usa. Se o site pedir login, lança `AccessRequiredError`; se o
 * yt-dlp falhar por outro motivo, tenta se atualizar uma vez (os sites mudam) e tenta de novo.
 */
/** Apaga o que sobrou de um download interrompido (`<nome>.*.part`, `.ytdl`, `.temp`). */
async function removePartialFiles(dir: string, baseName: string): Promise<void> {
  try {
    for (const name of await fs.promises.readdir(dir)) {
      if (name.startsWith(`${baseName}.`) && /\.(part|ytdl|temp)$/i.test(name)) {
        await fs.promises.rm(path.join(dir, name), { force: true });
      }
    }
  } catch {
    // pasta inexistente: nada a limpar
  }
}

export class PlatformDownloader {
  constructor(private readonly deps: PlatformDownloaderDeps) {}

  /** Quem acompanha o download atual (um job por vez usa o downloader). */
  private onProgress?: PercentListener;
  private signal?: AbortSignal;

  async download(
    url: string,
    baseName: string,
    destinationDir: string,
    onProgress?: PercentListener,
    signal?: AbortSignal,
  ): Promise<string> {
    const ytDlp = this.deps.tools?.ytDlpPath();

    if (!ytDlp) {
      throw new Error(PlatformMessages.notInstalled);
    }

    const cookies = (await this.deps.tools?.cookiesFor(url)) ?? null;

    this.onProgress = onProgress && onlyChanges(onProgress);
    this.signal = signal;

    try {
      return await this.attempt(ytDlp, url, baseName, destinationDir, cookies?.file);
    } catch (error) {
      if (isAbortError(error)) {
        // Cancelado: apaga o que o yt-dlp deixou pela metade (o `.part` seria tomado por download pronto).
        await removePartialFiles(destinationDir, baseName);
      }

      throw error;
    } finally {
      this.onProgress = undefined;
      this.signal = undefined;
      await cookies?.cleanup();
    }
  }

  /** Roda o yt-dlp; com alguém acompanhando, lê a porcentagem que ele escreve. */
  private runYtDlp(ytDlp: string, args: string[]) {
    const notify = this.onProgress;
    const signal = this.signal;

    if (!notify && !signal) {
      return this.deps.run(ytDlp, args);
    }

    return this.deps.run(
      ytDlp,
      args,
      notify &&
        ((text) => {
          const percent = parseYtDlpPercent(text);

          if (percent !== null) {
            notify(percent);
          }
        }),
      signal,
    );
  }

  private async attempt(
    ytDlp: string,
    url: string,
    baseName: string,
    destinationDir: string,
    cookiesFile: string | undefined,
    canUpdate = true,
    browser?: string,
    referer?: string,
  ): Promise<string> {
    let stdout: string;

    try {
      ({ stdout } = await this.runYtDlp(
        ytDlp,
        this.args(url, baseName, destinationDir, cookiesFile, browser, referer),
      ));
    } catch (error) {
      // Cancelado: não é falha do site (nada de pedir login, atualizar o yt-dlp ou tentar de novo).
      if (isAbortError(error)) {
        throw error;
      }

      const text = errorText(error);

      if (isAccessFailure(text) || (browser && COOKIE_READ_FAILURE.test(text))) {
        // Pediu login: tenta uma vez com os logins do navegador principal; se nem assim, o usuário entra pelo app.
        const mainBrowser = browser ? null : await this.deps.tools?.browser?.();

        if (mainBrowser) {
          return this.attempt(
            ytDlp,
            url,
            baseName,
            destinationDir,
            cookiesFile,
            canUpdate,
            mainBrowser,
          );
        }

        throw new AccessRequiredError(url);
      }

      const findMedia = this.deps.tools?.findMedia;

      if (!referer && findMedia && /unsupported url/i.test(text)) {
        return this.fromPage(findMedia, ytDlp, url, baseName, destinationDir);
      }

      if (canUpdate && (await this.update(ytDlp))) {
        return this.attempt(ytDlp, url, baseName, destinationDir, cookiesFile, false, browser);
      }

      throw new Error(PlatformMessages.failed(lastErrorLine(text)), { cause: error });
    }

    const file = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);

    if (!file) {
      throw new Error(PlatformMessages.noFile);
    }

    return path.resolve(file);
  }

  /**
   * Página que o yt-dlp não reconhece (ex.: aula do Canvas): procura o vídeo no HTML e baixa o
   * primeiro endereço que o yt-dlp aceitar, usando a página como referência e os logins do app.
   */
  private async fromPage(
    findMedia: (url: string) => Promise<MediaScan>,
    ytDlp: string,
    url: string,
    baseName: string,
    destinationDir: string,
  ): Promise<string> {
    const found = await findMedia(url);

    if (found.loginRequired) {
      throw new AccessRequiredError(url);
    }

    if (found.urls.length === 0) {
      throw new Error(PlatformMessages.noVideoInPage);
    }

    // Lê os cookies depois da busca: abrir a página pode ter renovado a sessão.
    const cookies = (await this.deps.tools?.cookiesFor(url)) ?? null;
    let lastError: unknown;
    let needsAccess = false;

    try {
      for (const candidate of found.urls) {
        try {
          return await this.attempt(
            ytDlp,
            candidate,
            baseName,
            destinationDir,
            cookies?.file,
            false,
            undefined,
            url,
          );
        } catch (error) {
          needsAccess ||= error instanceof AccessRequiredError;
          lastError = error;
        }
      }
    } finally {
      await cookies?.cleanup();
    }

    if (needsAccess) {
      throw new AccessRequiredError(url);
    }

    throw lastError;
  }

  /** `yt-dlp -U`; devolve `false` quando não deu para atualizar (sem rede, pasta protegida). */
  private async update(ytDlp: string): Promise<boolean> {
    try {
      await this.deps.run(ytDlp, ['-U']);

      return true;
    } catch {
      return false;
    }
  }

  private args(
    url: string,
    baseName: string,
    destinationDir: string,
    cookiesFile: string | undefined,
    browser?: string,
    referer?: string,
  ): string[] {
    const { ffmpegPath } = this.deps;
    const ownFfmpeg =
      ffmpegPath && path.isAbsolute(ffmpegPath) ? ['--ffmpeg-location', ffmpegPath] : [];

    return [
      '--no-playlist',
      '--no-warnings',
      ...(this.onProgress
        ? ['--newline', '--progress-template', 'download:HLPROG %(progress._percent_str)s']
        : ['--no-progress']),
      '--no-simulate',
      '-f',
      'bestaudio/best',
      ...ownFfmpeg,
      ...(cookiesFile ? ['--cookies', cookiesFile] : []),
      ...(browser ? ['--cookies-from-browser', browser] : []),
      ...(referer ? ['--referer', referer] : []),
      '-P',
      destinationDir,
      '-o',
      `${baseName}.%(ext)s`,
      '--print',
      'after_move:filepath',
      url,
    ];
  }
}
