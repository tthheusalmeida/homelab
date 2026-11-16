import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '#hooks/use-ipc-event';
import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';
import type { ComponentsStatus } from '#shared/contracts/components';
import { IpcEvents } from '#shared/events';

export const ComponentsQueryKey = ['components', 'status'] as const;

/**
 * Lista de componentes (Whisper, ffmpeg, CUDA, modelos). O evento `components:progress` troca o
 * valor em cache a cada passo, então todos que usam o hook (sidebar, assistente, Configurações)
 * mostram o mesmo progresso, nas duas janelas.
 */
export function useComponentsStatus() {
  const queryClient = useQueryClient();

  useIpcEvent(IpcEvents.componentsProgress, (status) => {
    queryClient.setQueryData(ComponentsQueryKey, status);
  });

  return useQuery({
    queryKey: ComponentsQueryKey,
    queryFn: () => ipc.invoke(IpcChannels.components.status),
  });
}

function useStatusMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<ComponentsStatus>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (status) => queryClient.setQueryData(ComponentsQueryKey, status),
  });
}

export function useInstallComponents() {
  return useStatusMutation((ids: string[]) => ipc.invoke(IpcChannels.components.install, { ids }));
}

export function useRemoveComponent() {
  return useStatusMutation((id: string) => ipc.invoke(IpcChannels.components.remove, { id }));
}

export function useSetActiveModel() {
  return useStatusMutation((id: string) =>
    ipc.invoke(IpcChannels.components.setActiveModel, { id }),
  );
}

export function cancelComponentsInstall() {
  return ipc.invoke(IpcChannels.components.cancel);
}

/** Abre as Configurações já na seção Componentes. */
export function openComponentsSettings() {
  return ipc.invoke(IpcChannels.app.openSettings, { section: 'components' });
}
