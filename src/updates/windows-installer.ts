import * as fs from 'node:fs';
import * as path from 'node:path';

import { downloadVerified, type FetchLike } from '../components/downloader';

import type { InstallerAsset } from './release-source';

export interface InstallerDownloadDeps {
  fetchFn: FetchLike;
  /** Pasta onde o instalador fica (em `userData`; só guarda a versão em uso). */
  dir: string;
}

/**
 * Baixa o instalador para `dir` (apagando os de antes), conferindo o SHA-256, e devolve o caminho.
 * `onProgress` recebe 0 a 100.
 */
export async function downloadInstaller(
  deps: InstallerDownloadDeps,
  asset: InstallerAsset & { sha256: string },
  onProgress: (percent: number) => void,
): Promise<string> {
  await fs.promises.rm(deps.dir, { recursive: true, force: true });

  // Só o nome do arquivo: nada vindo da rede escolhe a pasta de destino.
  const destination = path.join(deps.dir, path.basename(asset.name));

  await downloadVerified(deps.fetchFn, {
    url: asset.url,
    destination,
    sha256: asset.sha256,
    expectedBytes: asset.size,
    onProgress: (received, total) => onProgress(total > 0 ? (received / total) * 100 : 0),
  });

  return destination;
}

/** Argumentos do instalador (NSIS do `electron-builder`): silencioso, reabre o app ao terminar. */
export const INSTALLER_ARGS = ['/S', '--updated', '--force-run'] as const;

export interface InstallerLaunchDeps {
  /** Abre o programa desligado do app (`spawn` com `detached`). */
  spawnDetached(file: string, args: readonly string[]): void;
  /** Fecha o app para o instalador poder trocar os arquivos. */
  quit(): void;
}

/** Abre o instalador baixado e fecha o app. */
export function launchInstaller(deps: InstallerLaunchDeps, file: string): void {
  deps.spawnDetached(file, INSTALLER_ARGS);
  deps.quit();
}
