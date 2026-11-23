import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';
import type { AiPreference, AiSelectionState } from '#shared/contracts/ai';

export const AiInUseQueryKey = ['ai', 'selection'] as const;

/** A IA que vale agora para sugestão de título, mapa mental e infográfico (e de onde ela vem). */
export function useAiInUse() {
  return useQuery({
    queryKey: AiInUseQueryKey,
    queryFn: () => ipc.invoke(IpcChannels.ai.selection),
  });
}

/** Troca a IA só até fechar o app; `null` volta ao padrão. */
export function useSwitchSessionAi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preference: AiPreference | null) =>
      ipc.invoke(IpcChannels.ai.session, { preference }),
    onSuccess: (state: AiSelectionState) => queryClient.setQueryData(AiInUseQueryKey, state),
  });
}

/** Guarda a IA padrão em Configurações; `null` volta ao automático. */
export function useSaveAiDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preference: AiPreference | null) =>
      ipc.invoke(IpcChannels.ai.defaultUpdate, { preference }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AiInUseQueryKey }),
  });
}
