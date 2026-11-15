import { type AIProviderName } from '../../../../ai/ai.model';
import { type SummaryDetail } from '../../../../ai/prompts/summary-specialist.prompt';

export class VideoToSummaryDto {
  url!: string;

  providerId!: AIProviderName;

  modelId!: string;

  thinking?: string;

  detail?: SummaryDetail;

  title?: string;

  category?: string[];

  tags?: string[];
}
