import { BrowserWindow, session } from 'electron';

import type { CookieLike } from '../platform/netscape-cookies';
import { isHttpUrl } from '../shared/media-url';

/**
 * Sessão própria dos logins de plataformas: separada do app e **só em memória** (sem `persist:`).
 * Quem guarda os logins entre aberturas é o `CookieVault`, cifrado; nada fica em texto puro no disco.
 */
export const PLATFORM_PARTITION = 'platform-login';

/** Navegador "normal" para o site: sem `Electron/` nem o nome do app, que alguns logins recusam. */
function browserUserAgent(userAgent: string): string {
  return userAgent.replace(/\s?Electron\/\S+/, '').replace(/\s?homelab-desktop\/\S+/i, '');
}

export function platformSession() {
  const platform = session.fromPartition(PLATFORM_PARTITION);

  platform.setUserAgent(browserUserAgent(platform.getUserAgent()));

  return platform;
}

/** Devolve à sessão da janela os logins guardados (cookie de host não leva `domain`, como o original). */
export async function restorePlatformCookies(
  target: Electron.Session,
  cookies: CookieLike[],
): Promise<void> {
  await Promise.all(
    cookies
      .filter((cookie) => cookie.domain)
      .map((cookie) => {
        const domain = cookie.domain as string;
        const host = domain.replace(/^\./, '');

        return target.cookies
          .set({
            url: `${cookie.secure ? 'https' : 'http'}://${host}${cookie.path || '/'}`,
            name: cookie.name,
            value: cookie.value,
            domain: domain.startsWith('.') ? domain : undefined,
            path: cookie.path || '/',
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
          })
          .catch(() => undefined);
      }),
  );
}

export interface LoginWindowOptions {
  parent: BrowserWindow | null;
  url: string;
  title: string;
}

/**
 * Janela com o site do vídeo para o usuário entrar. Roda isolada (sem Node, sem preload, sandbox) e
 * só navega por http e https. Resolve quando o usuário a fecha.
 */
export function openPlatformLoginWindow({ parent, url, title }: LoginWindowOptions): Promise<void> {
  return new Promise((resolve) => {
    const window = new BrowserWindow({
      width: 1000,
      height: 720,
      title,
      parent: parent ?? undefined,
      autoHideMenuBar: true,
      webPreferences: {
        session: platformSession(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // O título da página não deve esconder a instrução de fechar a janela.
    window.on('page-title-updated', (event) => event.preventDefault());
    window.on('closed', () => resolve());

    window.webContents.on('will-navigate', (event, target) => {
      if (!isHttpUrl(target)) {
        event.preventDefault();
      }
    });

    // Logins costumam abrir pop-ups (Google, Microsoft): abre na mesma janela; outros protocolos não abrem.
    window.webContents.setWindowOpenHandler(({ url: target }) => {
      if (isHttpUrl(target)) {
        void window.loadURL(target);
      }

      return { action: 'deny' };
    });

    void window.loadURL(url);
  });
}
