import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPdfToSummary } from '../api/pdf';

export function useCreatePdfToSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPdfToSummary,
    // O job novo aparece na tela de andamento e no contador da barra lateral sem esperar a próxima consulta.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
