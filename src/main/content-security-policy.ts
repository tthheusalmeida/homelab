export type CspMode = 'dev' | 'build';

export interface CspOptions {
  mode: CspMode;
  /** Porta do HTTP do Nest (o front ainda o usa até a fase 09). */
  apiPort: string;
  /** Origens dos servidores de desenvolvimento (Vite) e seus WebSockets de HMR. */
  devOrigins: string[];
}

export const CSP_HEADER = 'Content-Security-Policy';

/**
 * Política de segurança de conteúdo das janelas. Nunca permite `unsafe-eval`.
 * - build: scripts só do próprio app (`app://front`).
 * - dev: o Vite injeta um script inline (preâmbulo do React Refresh) e usa WebSocket (HMR).
 * - Imagens aceitam http(s) porque a biblioteca e as capas de livros usam URLs externas.
 */
export function buildContentSecurityPolicy({ mode, apiPort, devOrigins }: CspOptions): string {
  const dev = mode === 'dev';
  const apiOrigins = [`http://localhost:${apiPort}`, `http://127.0.0.1:${apiPort}`];
  const devSockets = devOrigins.map((origin) => origin.replace(/^http/, 'ws'));

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': dev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...apiOrigins, ...(dev ? [...devOrigins, ...devSockets] : [])],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/** Cabeçalhos de resposta do Electron (`Record<string, string[]>`) com a CSP trocada pela nossa. */
export function applyCspHeader(
  headers: Record<string, string[]>,
  policy: string,
): Record<string, string[]> {
  const kept = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.toLowerCase() !== CSP_HEADER.toLowerCase()),
  );

  return { ...kept, [CSP_HEADER]: [policy] };
}
