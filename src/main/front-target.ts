import { APP_ENTRY_URL, MainEnv } from './constants';

type Env = Record<string, string | undefined>;

export interface FrontTarget {
  kind: 'dev' | 'build';
  url: string;
  origin: string;
}

/**
 * Decide o que a janela carrega: o servidor do Vite (dev, quando
 * `HOMELAB_FRONT_URL` está definida) ou o build estático via protocolo `app`.
 */
export function resolveFrontTarget(env: Env, appOrigin: string): FrontTarget {
  const devUrl = env[MainEnv.FRONT_URL]?.trim();

  if (devUrl) {
    return { kind: 'dev', url: devUrl, origin: new URL(devUrl).origin };
  }

  return { kind: 'build', url: APP_ENTRY_URL, origin: appOrigin };
}
