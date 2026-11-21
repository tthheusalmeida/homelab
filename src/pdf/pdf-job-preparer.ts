import { BadRequestException } from '@nestjs/common';

import type { PdfToSummaryDto } from '../back/modules/jobs/processors/pdf-to-summary/dto/pdf-to-summary.dto';
import { PdfJobMessages } from '../back/modules/jobs/processors/pdf-to-summary/processor';
import { chunkPages, type PdfChunk } from '../back/modules/pdf/pdf-chunker';
import {
  checkpointKey,
  type CheckpointManifest,
  type CheckpointParams,
} from '../back/modules/pdf/pdf-checkpoint.store';
import {
  DEFAULT_SUMMARY_DETAIL,
  isSummaryDetail,
} from '../back/modules/ai/prompts/summary-specialist.prompt';
import type { CreatePdfToSummaryRequest } from '../shared/contracts/jobs';
import type { PdfSessionStore } from './pdf-session.store';

export const PdfPrepareMessages = {
  sessionExpired:
    'A leitura deste PDF não está mais disponível (o app foi reiniciado ou outros PDFs foram lidos depois). ' +
    'Escolha o arquivo de novo.',
} as const;

/** A parte do `PdfCheckpointStore` usada para preparar o trabalho. */
export interface CheckpointWriter {
  create(
    key: string,
    info: { fileName: string; pageCount: number; params: CheckpointParams },
    chunks: PdfChunk[],
  ): Promise<CheckpointManifest>;
  load(key: string): Promise<CheckpointManifest | null>;
}

export interface PdfJobPreparerDeps {
  sessions: Pick<PdfSessionStore, 'get' | 'discard'>;
  checkpoints: CheckpointWriter;
  /** Divide o texto em partes (por omissão o do back; os testes trocam por um falso). */
  chunk?: (pages: string[]) => PdfChunk[];
}

/**
 * Prepara o job de resumo de um PDF: pega o texto lido (pelo token), divide em partes e **grava tudo
 * em disco antes de o job existir**. Daí em diante o job não precisa mais do PDF nem da memória do
 * app: retomar lê a pasta de progresso pela chave.
 */
export class PdfJobPreparer {
  constructor(private readonly deps: PdfJobPreparerDeps) {}

  async prepare(request: CreatePdfToSummaryRequest): Promise<PdfToSummaryDto> {
    const session = this.deps.sessions.get(request.token);

    if (!session) {
      throw new BadRequestException(PdfPrepareMessages.sessionExpired);
    }

    const detail = isSummaryDetail(request.detail) ? request.detail : DEFAULT_SUMMARY_DETAIL;
    const params: CheckpointParams = {
      providerId: request.providerId,
      modelId: request.modelId,
      detail,
      ...(request.thinking ? { thinking: request.thinking } : {}),
    };
    const chunks = (this.deps.chunk ?? ((pages: string[]) => chunkPages(pages)))(
      session.extraction.pages,
    );
    const key = checkpointKey(chunks, params);

    await this.deps.checkpoints.create(
      key,
      { fileName: session.fileName, pageCount: session.extraction.pageCount, params },
      chunks,
    );

    // a partir daqui o texto está em disco: a leitura da memória não é mais necessária
    this.deps.sessions.discard(request.token);

    return {
      checkpointKey: key,
      fileName: session.fileName,
      providerId: request.providerId,
      modelId: request.modelId,
      detail,
      ...(request.thinking ? { thinking: request.thinking } : {}),
      ...(request.title ? { title: request.title } : {}),
      ...(request.category ? { category: request.category } : {}),
      ...(request.tags ? { tags: request.tags } : {}),
    };
  }

  /** Confere se o progresso do job (ao tentar de novo) ainda está em disco. */
  async assertProgressExists(key: string): Promise<void> {
    if (!(await this.deps.checkpoints.load(key))) {
      throw new BadRequestException(PdfJobMessages.missingProgress);
    }
  }
}
