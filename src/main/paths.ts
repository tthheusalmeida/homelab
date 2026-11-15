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

/** Pasta do build do front: `HOMELAB_FRONT_DIST_DIR` ou `../front/dist`. */
export function resolveFrontDist(projectRoot: string, env: Env): string {
  return env[MainEnv.FRONT_DIST_DIR] ?? path.resolve(projectRoot, '..', 'front', 'dist');
}
