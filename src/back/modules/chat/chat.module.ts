import { Module } from '@nestjs/common';

import { AIModule } from '../ai/ai.module';

import { ChatService } from './chat.service';

@Module({
  imports: [AIModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
