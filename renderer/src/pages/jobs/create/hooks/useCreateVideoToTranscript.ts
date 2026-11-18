import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createVideoToTranscriptBatch } from "../api/create";

export function useCreateVideoToTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVideoToTranscriptBatch,
    // O job novo aparece na tela de andamento e no contador da barra lateral sem esperar a próxima consulta.
    // Mesmo com falha parcial, os jobs que entraram aparecem na hora.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
