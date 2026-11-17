import { APP_ENTRY_URL, MainEnv, SPLASH_PATH } from './constants';

type Env = Record<string, string | undefined>;

export interface FrontTarget {
  kind: 'dev' | 'build';
  /** Página principal. */
  url: string;
  origin: string;
  /** Tela de abertura (loading de colmeia). */
  splashUrl: string;
}

/**
 * Decide o que as janelas carregam: os servidores do Vite (dev, quando
 * `HOMELAB_FRONT_URL` está definida) ou o build estático via protocolo `app`.
 */
export function resolveFrontTarget(env: Env, appOrigin: string): FrontTarget {
  const devUrl = env[MainEnv.FRONT_URL]?.trim();

  if (devUrl) {
    return {
      kind: 'dev',
      url: devUrl,
      origin: new URL(devUrl).origin,
      splashUrl: new URL(SPLASH_PATH, devUrl).toString(),
    };
  }

  return {
    kind: 'build',
    url: APP_ENTRY_URL,
    origin: appOrigin,
    splashUrl: `${appOrigin}${SPLASH_PATH}`,
  };
}
