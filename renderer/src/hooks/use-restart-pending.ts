import { useCallback } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '#hooks/use-ipc-event';
import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';

export const RestartPendingQueryKey = ['app', 'restart-pending'] as const;

/**
 * Há alteração salva que só vale depois de reiniciar? O estado vive no main e o evento
 * `app:restart-needed` o troca no cache, então a barra lateral do app e a janela de Configurações
 * mostram o mesmo aviso, inclusive depois de fechar e reabrir as Configurações.
 */
export function useRestartPending(): boolean {
  const queryClient = useQueryClient();

  useIpcEvent(IpcEvents.restartPending, (pending) => {
    queryClient.setQueryData(RestartPendingQueryKey, pending);
  });

  const { data } = useQuery({
    queryKey: RestartPendingQueryKey,
    // Só vira `true` até reiniciar: uma resposta antiga (`false`) nunca rebaixa o que já se sabe.
    queryFn: async () =>
      (await ipc.invoke(IpcChannels.app.restartPending)) ||
      queryClient.getQueryData(RestartPendingQueryKey) === true,
  });

  return data === true;
}

/** Marca o reinício como pendente: aparece na hora e o main avisa as outras janelas. */
export function useMarkRestartPending(): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.setQueryData(RestartPendingQueryKey, true);
    ipc
      .invoke(IpcChannels.app.markRestartPending)
      // Reafirma quando o main confirma: uma consulta antiga ainda no ar não pode apagar o aviso.
      .then(() => queryClient.setQueryData(RestartPendingQueryKey, true))
      .catch(() => undefined);
  }, [queryClient]);
}
