import * as path from 'node:path';

import { DATA_ROOT_FOLDER, MainEnv } from './constants';

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

/**
 * Pasta dos binários nativos do sistema (`bin/<platform>-<arch>`).
 * - Instalado (Windows incluso): nos dados do usuário, que sobrevivem às atualizações. O instalador
 *   apaga a pasta de instalação a cada versão, então o que o assistente baixou (CUDA, programas)
 *   não pode morar nela; o que vem no instalador é levado para cá por `seedBinDir`. No Linux e no
 *   macOS também é aqui, porque o AppImage e o `.app` são somente leitura.
 * - Windows em desenvolvimento: `resources/bin` do projeto.
 */
export function resolveBinDir(
  resourcesDir: string,
  platform: NodeJS.Platform,
  arch: string,
  userDataDir: string,
  packaged = true,
): string {
  const base =
    platform === 'win32' && !packaged
      ? path.join(resourcesDir, 'bin')
      : path.join(userDataDir, 'bin');

  return path.join(base, `${platform}-${arch}`);
}

/** Raiz dos dados do HomeLab: `HOMELAB_DATA_ROOT_DIR` ou `Documentos/HomeLab`. */
export function resolveDataRoot(documentsDir: string, env: Env): string {
  return env[MainEnv.DATA_ROOT_DIR] ?? path.join(documentsDir, DATA_ROOT_FOLDER);
}
