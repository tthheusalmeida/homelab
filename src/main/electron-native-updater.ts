import { autoUpdater } from 'electron-updater';

import type { NativeUpdater } from '../updates/native-updater';

/**
 * Atualizador nativo sobre o `electron-updater` (instalador NSIS do Windows). O feed aponta para a
 * pasta de download do Release da versão escolhida (`releases/download/v<versão>`), onde estão o
 * `latest.yml` (versão e SHA-512) e o `.blockmap`; assim só os blocos que mudaram são baixados e o
 * atualizador nunca olha Releases de componentes ou de binários. O endereço é fixo no código: só
 * aceita atualização do repositório do projeto. Não tem teste unitário (depende do Electron): o
 * `AppUpdater` é testado com uma versão falsa desta porta.
 */
export function createElectronNativeUpdater(repository: string): NativeUpdater {
  let onProgress: ((percent: number) => void) | null = null;

  // Nós decidimos quando baixar (depois de checar e de avisar a tela); instalar ao fechar o app fica
  // ligado para a versão baixada entrar mesmo que o usuário não clique em "Reiniciar e atualizar".
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = null;
  autoUpdater.on('download-progress', (progress) => onProgress?.(progress.percent));

  return {
    async prepare(version) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: `https://github.com/${repository}/releases/download/v${version}`,
      });

      const result = await autoUpdater.checkForUpdates();

      return Boolean(result?.isUpdateAvailable) && result?.updateInfo.version === version;
    },

    async download(progress) {
      onProgress = progress;

      try {
        await autoUpdater.downloadUpdate();
      } finally {
        onProgress = null;
      }
    },

    quitAndInstall() {
      // Silencioso e reabre o app ao terminar (NSIS: `/S --updated --force-run`).
      autoUpdater.quitAndInstall(true, true);
    },
  };
}
