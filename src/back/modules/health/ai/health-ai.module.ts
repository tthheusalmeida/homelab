import { Module } from '@nestjs/common';

import { AIModule } from '../../ai/ai.module';
import { HealthAIService } from './health-ai.service';

@Module({
  imports: [AIModule],
  providers: [HealthAIService],
  exports: [HealthAIService],
})
export class HealthAIModule {}
