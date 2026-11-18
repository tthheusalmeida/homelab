import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createVideoToSummaryBatch } from "../api/create";

export function useCreateVideoToSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVideoToSummaryBatch,
    // O job novo aparece na tela de andamento e no contador da barra lateral sem esperar a próxima consulta.
    // Mesmo com falha parcial, os jobs que entraram aparecem na hora.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
