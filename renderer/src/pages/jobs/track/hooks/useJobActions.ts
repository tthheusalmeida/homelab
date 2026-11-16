import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cancelJob, retryJob, undoDeleteJobs } from "../api/track";

/** Cancela um job e atualiza a lista na hora. */
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

/** Tenta de novo um job que falhou (cria outro igual) e atualiza a lista. */
export function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

/** Desfaz a última exclusão e atualiza a lista. */
export function useUndoDeleteJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoDeleteJobs,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
