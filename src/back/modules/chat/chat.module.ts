import { Module } from '@nestjs/common';

import { JsonFile } from '../../../storage/json-file';
import { BackAlerts } from '../../config/back-alerts';
import { BackConfig } from '../../config/back-config';
import { AIModule } from '../ai/ai.module';
import { RagContextService } from '../rag/application/rag-context.service';
import { RagModule } from '../rag/rag.module';

import type { ChatsFileData } from './chat.model';
import { CHAT_CONTEXT } from './chat-context';
import { CHAT_REPOSITORY } from './chat.repository';
import { ChatService } from './chat.service';
import { FileChatRepository } from './file-chat.repository';
import { InMemoryChatRepository } from './in-memory-chat.repository';

@Module({
  imports: [AIModule, RagModule],
  providers: [
    ChatService,
    // As páginas da biblioteca acompanham cada pergunta (a busca é do módulo rag).
    { provide: CHAT_CONTEXT, useExisting: RagContextService },
    {
      provide: CHAT_REPOSITORY,
      inject: [BackConfig, BackAlerts],
      // Com `chatsFile` as conversas ficam em disco; sem ele (testes) só em memória.
      useFactory: (config: BackConfig, alerts: BackAlerts) =>
        config.chatsFile
          ? new FileChatRepository(new JsonFile<ChatsFileData>(config.chatsFile), (reason) =>
              alerts.persistFailed('as conversas', reason),
            )
          : new InMemoryChatRepository(),
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
