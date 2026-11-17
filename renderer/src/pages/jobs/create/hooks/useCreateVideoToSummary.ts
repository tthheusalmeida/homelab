import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createVideoToSummary } from "../api/create";

export function useCreateVideoToSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVideoToSummary,
    // O job novo aparece na tela de andamento e no contador da barra lateral sem esperar a próxima consulta.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
