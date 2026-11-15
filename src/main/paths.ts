import * as path from 'node:path';

import { MainEnv } from './constants';

type Env = Record<string, string | undefined>;

/** Pasta do build do renderer: `HOMELAB_FRONT_DIST_DIR` ou `dist-renderer` do desktop. */
export function resolveFrontDist(projectRoot: string, env: Env): string {
  return env[MainEnv.FRONT_DIST_DIR] ?? path.join(projectRoot, 'dist-renderer');
}

/**
 * Pasta `resources` do app: no instalador é a `resources` ao lado do executável
 * (`process.resourcesPath`, onde o `extraResources` coloca os binários, fora do asar);
 * em desenvolvimento é a `resources` do projeto.
 */
export function resolveResourcesDir(
  projectRoot: string,
  packaged: boolean,
  resourcesPath: string,
): string {
  return packaged ? resourcesPath : path.join(projectRoot, 'resources');
}

/** Pasta dos binários nativos da plataforma: `<resources>/bin/<platform>-<arch>`. */
export function resolveBinDir(
  resourcesDir: string,
  platform: NodeJS.Platform,
  arch: string,
): string {
  return path.join(resourcesDir, 'bin', `${platform}-${arch}`);
}
