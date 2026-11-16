/** Cookie como o Electron entrega (`session.cookies.get`), só com o que o arquivo precisa. */
export interface CookieLike {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  /** Segundos desde 1970; ausente em cookie de sessão. */
  expirationDate?: number;
}

const HEADER =
  '# Netscape HTTP Cookie File\n# Gerado pelo HomeLab para o yt-dlp. Apagado ao fim do download.\n';

/** Cookie de sessão não tem validade; o yt-dlp o trata como vencido se for 0, então dá um dia de prazo. */
const SESSION_COOKIE_SECONDS = 24 * 60 * 60;

/** Texto do arquivo de cookies no formato que o yt-dlp lê (`--cookies`). */
export function toNetscapeCookies(cookies: CookieLike[], nowSeconds: number): string {
  const lines = cookies
    .filter((cookie) => cookie.domain && cookie.name)
    .map((cookie) => {
      const domain = cookie.domain as string;
      const subdomains = domain.startsWith('.');
      const expires = Math.floor(cookie.expirationDate ?? nowSeconds + SESSION_COOKIE_SECONDS);

      return [
        `${cookie.httpOnly ? '#HttpOnly_' : ''}${domain}`,
        subdomains ? 'TRUE' : 'FALSE',
        cookie.path || '/',
        cookie.secure ? 'TRUE' : 'FALSE',
        String(expires),
        cookie.name,
        cookie.value,
      ].join('\t');
    });

  return `${HEADER}${lines.join('\n')}\n`;
}

/** O cookie vale para este endereço? (domínio igual ou subdomínio dele) */
export function cookieMatchesHost(cookie: CookieLike, host: string): boolean {
  const domain = (cookie.domain ?? '').replace(/^\./, '').toLowerCase();
  const target = host.toLowerCase();

  return domain !== '' && (target === domain || target.endsWith(`.${domain}`));
}
