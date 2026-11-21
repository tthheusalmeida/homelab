import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cleanLeftovers, scanLeftovers } from '../api/track';

/** Mede o que processos não terminados deixaram no disco (não apaga nada). */
export function useScanLeftovers() {
  return useMutation({ mutationFn: scanLeftovers });
}

/** Apaga esses arquivos e atualiza a lista (o progresso de um resumo de PDF some junto). */
export function useCleanLeftovers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cleanLeftovers,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
