import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '#hooks/use-ipc-event';
import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';
import type { UpdateStatus } from '#shared/contracts/updates';
import { IpcEvents } from '#shared/events';

export const UpdatesQueryKey = ['updates', 'status'] as const;

/**
 * Estado da atualização do app. O evento `updates:changed` troca o valor em cache a cada passo
 * (nova versão, progresso, erro), então a barra lateral e a seção das Configurações mostram o mesmo.
 */
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  useIpcEvent(IpcEvents.updatesChanged, (status) => {
    queryClient.setQueryData(UpdatesQueryKey, status);
  });

  return useQuery({
    queryKey: UpdatesQueryKey,
    queryFn: () => ipc.invoke(IpcChannels.updates.status),
  });
}

function useStatusMutation(mutationFn: () => Promise<UpdateStatus>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (status) => queryClient.setQueryData(UpdatesQueryKey, status),
  });
}

/** Consulta o GitHub agora. */
export function useCheckForUpdates() {
  return useStatusMutation(() => ipc.invoke(IpcChannels.updates.check));
}

/** Baixa a versão nova e a aplica (o app fecha e reabre). */
export function useInstallUpdate() {
  return useStatusMutation(() => ipc.invoke(IpcChannels.updates.install));
}
