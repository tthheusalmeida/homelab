import { useSnackbar } from '#components/Snackbar';
import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';

/** Texto do botão do aviso que leva ao arquivo salvo. */
export const REVEAL_LABEL = 'Ver';
export const REVEAL_MISSING = 'O arquivo não está mais nesse lugar.';

/**
 * Aviso de "arquivo salvo" (imagem, PDF, SVG, backup...). Quando se sabe onde o arquivo ficou, o
 * aviso ganha o botão **Ver**, que abre a pasta dele no gerenciador de arquivos com o arquivo
 * selecionado. Use este hook para todo arquivo que o usuário manda salvar.
 */
export function useSavedNotice() {
  const snackbar = useSnackbar();

  return (message: string, filePath?: string) => {
    if (!filePath) {
      snackbar.success(message);

      return;
    }

    snackbar.success(message, {
      label: REVEAL_LABEL,
      onClick: () => {
        void ipc
          .invoke(IpcChannels.app.revealFile, { path: filePath })
          .then((found) => {
            if (!found) {
              snackbar.error(REVEAL_MISSING);
            }
          })
          .catch((error: Error) => snackbar.error(error.message || REVEAL_MISSING));
      },
    });
  };
}
