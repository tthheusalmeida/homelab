import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IpcChannels } from '#shared/channels';
import { ipc } from '#lib/ipc';

export const SupportQueryKey = ['support'] as const;

/** Se o convite da estrela no GitHub ainda deve aparecer (some depois de estrelar ou dispensar). */
export function useSupport() {
  return useQuery({
    queryKey: SupportQueryKey,
    queryFn: () => ipc.invoke(IpcChannels.support.get),
  });
}

/** Marca o convite como visto: não aparece mais. */
export function useHideStarPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc.invoke(IpcChannels.support.update, { starPromptHidden: true }),
    onSuccess: (support) => queryClient.setQueryData(SupportQueryKey, support),
  });
}
