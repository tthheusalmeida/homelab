import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';

/** Textos do aviso de reinício (barra lateral do app e janela de Configurações). */
export const RestartStrings = {
  message: 'As alterações só valem depois de reiniciar o HomeLab.',
  action: 'Reiniciar agora',
  sidebarTitle: 'Reinício pendente',
  sidebarHint: 'As alterações só valem depois de reiniciar.',
} as const;

/** Reinicia o app (aplica as configurações que pediram reinício). */
export function relaunchApp() {
  return ipc.invoke(IpcChannels.app.relaunch);
}
