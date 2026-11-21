import { type AIProviderName } from '../../../../ai/ai.model';
import { type SummaryDetail } from '../../../../ai/prompts/summary-specialist.prompt';

/**
 * Dados do job de resumo de PDF. É também o `request` guardado no histórico (permite tentar de novo
 * depois de reiniciar): por isso leva a chave do progresso em disco e não o token da leitura, que
 * só existe na memória.
 */
export class PdfToSummaryDto {
  checkpointKey!: string;

  fileName!: string;

  providerId!: AIProviderName;

  modelId!: string;

  thinking?: string;

  detail?: SummaryDetail;

  title?: string;

  category?: string[];

  tags?: string[];
}
