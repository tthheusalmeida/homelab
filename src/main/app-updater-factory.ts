import * as path from 'node:path';

import type { FetchLike } from '../components/downloader';
import type { UpdateStatus } from '../shared/contracts/updates';
import { AppUpdater } from '../updates/app-updater';
import { GitHubReleaseSource, UPDATE_REPOSITORY } from '../updates/release-source';
import { downloadInstaller, launchInstaller } from '../updates/windows-installer';

/** Pasta (dentro de `userData`) onde o instalador baixado espera a troca. */
export const UPDATES_FOLDER = 'updates';

/** Tempo máximo para o GitHub responder a lista de versões. */
export const RELEASES_TIMEOUT_MS = 15_000;

export interface AppUpdaterWiring {
  currentVersion: string;
  platform: NodeJS.Platform;
  userDataDir: string;
  /** `fetch` do Electron (`net.fetch`), que segue os redirecionamentos do GitHub. */
  fetchFn: FetchLike;
  spawnDetached: (file: string, args: readonly string[]) => void;
  quit: () => void;
  openExternal: (url: string) => void;
  publish: (status: UpdateStatus) => void;
  notify: (title: string, body: string) => void;
}

/**
 * Monta o `AppUpdater` com o que o Electron oferece. Só o Windows aplica a atualização sozinho (o
 * instalador NSIS); nos outros sistemas o botão leva ao Release no navegador.
 */
export function createAppUpdater(wiring: AppUpdaterWiring): AppUpdater {
  const source = new GitHubReleaseSource(UPDATE_REPOSITORY, async (url) => {
    const response = await wiring.fetchFn(url, {
      signal: AbortSignal.timeout(RELEASES_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`GitHub respondeu ${response.status}`);
    }

    return response.json();
  });
  const installerDir = path.join(wiring.userDataDir, UPDATES_FOLDER);

  return new AppUpdater({
    currentVersion: wiring.currentVersion,
    canInstall: wiring.platform === 'win32',
    source,
    download: (asset, onProgress) =>
      downloadInstaller({ fetchFn: wiring.fetchFn, dir: installerDir }, asset, onProgress),
    launchInstaller: (file) =>
      launchInstaller({ spawnDetached: wiring.spawnDetached, quit: wiring.quit }, file),
    publish: wiring.publish,
    notifyAvailable: wiring.notify,
    openExternal: wiring.openExternal,
    now: () => Date.now(),
  });
}
