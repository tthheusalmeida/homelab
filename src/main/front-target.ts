import { APP_ENTRY_URL, DEFAULT_SETTINGS_DEV_URL, MainEnv, SETTINGS_BUILD_PATH } from './constants';

type Env = Record<string, string | undefined>;

export interface FrontTarget {
  kind: 'dev' | 'build';
  /** Página principal. */
  url: string;
  origin: string;
  /** Janela de Configurações. */
  settingsUrl: string;
  settingsOrigin: string;
}

/**
 * Decide o que as janelas carregam: os servidores do Vite (dev, quando
 * `HOMELAB_FRONT_URL` está definida) ou o build estático via protocolo `app`.
 */
export function resolveFrontTarget(env: Env, appOrigin: string): FrontTarget {
  const devUrl = env[MainEnv.FRONT_URL]?.trim();

  if (devUrl) {
    const settingsUrl = env[MainEnv.SETTINGS_URL]?.trim() || DEFAULT_SETTINGS_DEV_URL;

    return {
      kind: 'dev',
      url: devUrl,
      origin: new URL(devUrl).origin,
      settingsUrl,
      settingsOrigin: new URL(settingsUrl).origin,
    };
  }

  return {
    kind: 'build',
    url: APP_ENTRY_URL,
    origin: appOrigin,
    settingsUrl: `${appOrigin}${SETTINGS_BUILD_PATH}`,
    settingsOrigin: appOrigin,
  };
}
