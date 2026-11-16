import type { SecretStore } from '../settings/secret-store';

import type { CookieLike } from './netscape-cookies';

/** Só o que o app precisa de cada cookie; o resto do objeto do Electron não é guardado. */
function pick(cookie: CookieLike): CookieLike {
  const { name, value, domain, path, secure, httpOnly, expirationDate } = cookie;

  return { name, value, domain, path, secure, httpOnly, expirationDate };
}

/**
 * Logins das plataformas guardados cifrados (`safeStorage`, via `SecretStore`): nada em texto puro
 * no disco. Cookies vencidos são descartados na leitura.
 */
export class CookieVault {
  constructor(
    private readonly secrets: Pick<SecretStore, 'get' | 'set'>,
    private readonly now: () => number,
  ) {}

  async load(): Promise<CookieLike[]> {
    const text = await this.secrets.get('platform.cookies');

    if (!text) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(text);
      const nowSeconds = this.now() / 1000;

      return Array.isArray(parsed)
        ? (parsed as CookieLike[]).filter(
            (cookie) => cookie.expirationDate === undefined || cookie.expirationDate > nowSeconds,
          )
        : [];
    } catch {
      return [];
    }
  }

  async save(cookies: CookieLike[]): Promise<void> {
    await this.secrets.set('platform.cookies', JSON.stringify(cookies.map(pick)));
  }
}
