import * as path from 'node:path';

import { BACK_ENTRY_RELATIVE_PATH, MainEnv } from './constants';

type Env = Record<string, string | undefined>;

/** Pasta do back: `HOMELAB_BACK_DIR` ou `../back` ao lado do `desktop`. */
export function resolveBackDir(projectRoot: string, env: Env): string {
  return env[MainEnv.BACK_DIR] ?? path.resolve(projectRoot, '..', 'back');
}

export function resolveBackEntry(backDir: string): string {
  return path.join(backDir, ...BACK_ENTRY_RELATIVE_PATH);
}

/** Pasta do build do renderer: `HOMELAB_FRONT_DIST_DIR` ou `dist-renderer` do desktop. */
export function resolveFrontDist(projectRoot: string, env: Env): string {
  return env[MainEnv.FRONT_DIST_DIR] ?? path.join(projectRoot, 'dist-renderer');
}

/** `.env` antigo do back, usado só para importar a configuração na primeira execução (dev). */
export function resolveLegacyEnvFile(backDir: string): string {
  return path.join(backDir, '.env');
}

/** Pasta dos binários nativos da plataforma: `resources/bin/<platform>-<arch>`. */
export function resolveBinDir(
  projectRoot: string,
  platform: NodeJS.Platform,
  arch: string,
): string {
  return path.join(projectRoot, 'resources', 'bin', `${platform}-${arch}`);
}
