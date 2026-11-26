import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { useIpcEvent } from '#hooks/use-ipc-event';
import type { PdfReadStage } from '#shared/contracts/pdf';
import { IpcEvents } from '#shared/events';

import { cancelPdfRead, inspectPdf } from '../api/pdf';

/** Páginas lidas até agora na etapa; `total` 0 enquanto a etapa não tem contagem (abrir, idioma, download). */
export interface PdfReadProgress {
  done: number;
  total: number;
  stage: PdfReadStage;
}

/**
 * Escolhe e lê um PDF. `progress` acompanha as páginas lidas (evento do main) e fica `null` fora da
 * leitura; `cancel` interrompe (a leitura responde `null`, igual a cancelar o diálogo).
 */
export function useInspectPdf() {
  const [progress, setProgress] = useState<PdfReadProgress | null>(null);

  useIpcEvent(IpcEvents.pdfProgress, ({ phase, processed, total, stage }) => {
    setProgress(phase === 'done' ? null : { done: processed, total, stage });
  });

  const mutation = useMutation({
    mutationFn: inspectPdf,
    onSettled: () => setProgress(null),
  });

  return { ...mutation, progress, cancel: cancelPdfRead };
}
