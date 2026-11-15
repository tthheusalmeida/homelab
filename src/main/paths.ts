import * as path from 'node:path';

import { MainEnv } from './constants';

type Env = Record<string, string | undefined>;

/** Pasta do build do renderer: `HOMELAB_FRONT_DIST_DIR` ou `dist-renderer` do desktop. */
export function resolveFrontDist(projectRoot: string, env: Env): string {
  return env[MainEnv.FRONT_DIST_DIR] ?? path.join(projectRoot, 'dist-renderer');
}

/** Pasta dos binários nativos da plataforma: `resources/bin/<platform>-<arch>`. */
export function resolveBinDir(
  projectRoot: string,
  platform: NodeJS.Platform,
  arch: string,
): string {
  return path.join(projectRoot, 'resources', 'bin', `${platform}-${arch}`);
}
