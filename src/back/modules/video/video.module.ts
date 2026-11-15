import { Module } from '@nestjs/common';

import { AIModule } from '../ai/ai.module';

import { VideoService } from './video.service';

@Module({
  imports: [AIModule],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
