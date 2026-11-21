import { IpcChannels } from '#shared/channels';
import type { CreatePdfToSummaryRequest, JobCreated } from '#shared/contracts/jobs';
import type { PdfInspection } from '#shared/contracts/pdf';
import { ipc } from '#lib/ipc';

/**
 * Abre o seletor de arquivo (só PDF) e lê o texto. `null` quando o usuário cancela o diálogo ou a
 * leitura. O caminho do arquivo nunca chega aqui: só o token que identifica a leitura.
 */
export async function inspectPdf(): Promise<PdfInspection | null> {
  return ipc.invoke(IpcChannels.pdf.inspect);
}

/** Interrompe a leitura em andamento (`inspectPdf` responde `null`). */
export async function cancelPdfRead(): Promise<void> {
  return ipc.invoke(IpcChannels.pdf.cancel);
}

/** Cria o resumo do PDF lido (o texto vai para o disco antes de o job existir). */
export async function createPdfToSummary(params: CreatePdfToSummaryRequest): Promise<JobCreated> {
  return ipc.invoke(IpcChannels.jobs.createPdfToSummary, params);
}
