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

/**
 * Guarda a IA padrão em Configurações; `null` volta ao automático. Escolher a IA padrão vale agora:
 * uma troca só desta sessão, se houver, é desfeita (senão ela continuaria vencendo o padrão novo).
 */
export function useSaveAiDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preference: AiPreference | null): Promise<AiSelectionState> => {
      await ipc.invoke(IpcChannels.ai.defaultUpdate, { preference });

      return ipc.invoke(IpcChannels.ai.session, { preference: null });
    },
    onSuccess: (state) => queryClient.setQueryData(AiInUseQueryKey, state),
  });
}
