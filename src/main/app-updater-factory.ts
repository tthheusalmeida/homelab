import type { FetchLike } from '../components/downloader';
import type { UpdateStatus } from '../shared/contracts/updates';
import { AppUpdater } from '../updates/app-updater';
import type { NativeUpdater } from '../updates/native-updater';
import { GitHubReleaseSource, UPDATE_REPOSITORY } from '../updates/release-source';

/** Tempo máximo para o GitHub responder a lista de versões. */
export const RELEASES_TIMEOUT_MS = 15_000;

export interface AppUpdaterWiring {
  currentVersion: string;
  /** `fetch` do Electron (`net.fetch`), que segue os redirecionamentos do GitHub. */
  fetchFn: FetchLike;
  /**
   * Atualizador que baixa só a diferença e instala. `null` fora do Windows e fora do app
   * empacotado: aí o botão leva ao Release no navegador.
   */
  native: NativeUpdater | null;
  getAutoCheck: () => boolean;
  saveAutoCheck: (autoCheck: boolean) => void;
  openExternal: (url: string) => void;
  publish: (status: UpdateStatus) => void;
  notify: (title: string, body: string) => void;
}

/** Monta o `AppUpdater` com o que o Electron oferece. */
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

  return new AppUpdater({
    currentVersion: wiring.currentVersion,
    native: wiring.native,
    source,
    getAutoCheck: wiring.getAutoCheck,
    saveAutoCheck: wiring.saveAutoCheck,
    publish: wiring.publish,
    notify: wiring.notify,
    openExternal: wiring.openExternal,
    now: () => Date.now(),
  });
}
