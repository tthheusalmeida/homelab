import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteAllJobs, deleteJobs } from "../api/track";

/** Exclui jobs escolhidos e atualiza a lista na hora (sem esperar o próximo polling). */
export function useDeleteJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteJobs,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

/** Exclui todo o histórico (menos o que está ativo) e atualiza a lista. */
export function useDeleteAllJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllJobs,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
