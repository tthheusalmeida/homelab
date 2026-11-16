import * as path from 'node:path';

import type { CookieFile } from '../back/modules/video/platform-downloader';
import type { PlatformLogin } from '../jobs/job-access';
import { isHttpUrl } from '../shared/media-url';

import { cookieMatchesHost, toNetscapeCookies, type CookieLike } from './netscape-cookies';

export const PlatformSessionMessages = {
  invalidUrl: 'O endereço do vídeo não é um link http ou https.',
  windowTitle: 'Entre no site e feche esta janela quando terminar',
} as const;

export interface PlatformSessionsDeps {
  /** Cookies da janela de login (sessão só em memória, separada do resto do app). */
  readSession: () => Promise<CookieLike[]>;
  /** Coloca na sessão da janela os logins já guardados, para o usuário não precisar entrar de novo. */
  restoreSession: (cookies: CookieLike[]) => Promise<void>;
  /** Logins guardados (cifrados em disco com a criptografia do sistema). */
  loadSaved: () => Promise<CookieLike[]>;
  saveCookies: (cookies: CookieLike[]) => Promise<void>;
  /** Abre a janela do site e resolve quando o usuário a fecha. */
  openWindow: (url: string, title: string) => Promise<void>;
  /** Pasta para o arquivo temporário de cookies. */
  tempDir: string;
  writeFile: (file: string, text: string) => Promise<void>;
  removeFile: (file: string) => Promise<void>;
  now: () => number;
}

/**
 * Acesso a vídeos que exigem login. O usuário entra no site numa janela do próprio app (sessão
 * isolada, só em memória). Ao fechar a janela, os logins são guardados cifrados e voltam sozinhos
 * na próxima vez: o usuário entra uma vez só. Na hora do download, os cookies guardados vão para um
 * arquivo temporário que o yt-dlp lê e que é apagado logo depois.
 */
export class PlatformSessions implements PlatformLogin {
  private counter = 0;

  constructor(private readonly deps: PlatformSessionsDeps) {}

  /** Abre a janela de login do site; devolve `true` se, ao fechá-la, o app tem cookies desse site. */
  async openLogin(url: string): Promise<boolean> {
    if (!isHttpUrl(url)) {
      throw new Error(PlatformSessionMessages.invalidUrl);
    }

    await this.deps.restoreSession(await this.deps.loadSaved());
    await this.deps.openWindow(url, PlatformSessionMessages.windowTitle);

    const { hostname } = new URL(url);
    const cookies = await this.deps.readSession();

    await this.deps.saveCookies(cookies);

    return cookies.some((cookie) => cookieMatchesHost(cookie, hostname));
  }

  /**
   * Cookies guardados num arquivo temporário (`null` se o usuário ainda não entrou em nenhum site).
   * Vão todos: o yt-dlp só envia a cada site os cookies que são dele, e a sessão do app só tem os
   * sites em que o próprio usuário entrou.
   */
  async cookiesFor(): Promise<CookieFile | null> {
    const cookies = await this.deps.loadSaved();

    if (cookies.length === 0) {
      return null;
    }

    this.counter += 1;

    const file = path.join(this.deps.tempDir, `cookies-${this.deps.now()}-${this.counter}.txt`);

    await this.deps.writeFile(file, toNetscapeCookies(cookies, Math.floor(this.deps.now() / 1000)));

    return { file, cleanup: () => this.deps.removeFile(file) };
  }
}
