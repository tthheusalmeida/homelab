import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EMBEDDING_MODEL } from '../../../shared/embedding-model';
import { BackConfig } from '../../config/back-config';
import { LibraryModule } from '../library/library.module';

import { RagContextService } from './application/rag-context.service';
import { EMBEDDER } from './application/embedder';
import { EMBEDDING_STORE, RagSearchService } from './application/rag-search.service';
import { EmbeddingStore } from './infrastructure/embedding-store';
import { OllamaEmbedder } from './infrastructure/ollama-embedder';

@Module({
  imports: [LibraryModule, HttpModule],
  providers: [
    RagSearchService,
    RagContextService,
    // A busca por sentido usa o Ollama (o mesmo do chat); sem o modelo de vetores, é só por palavras.
    { provide: EMBEDDER, useClass: OllamaEmbedder },
    {
      provide: EMBEDDING_STORE,
      inject: [BackConfig],
      useFactory: (config: BackConfig) =>
        new EmbeddingStore(config.embeddingsFile ?? null, EMBEDDING_MODEL),
    },
  ],
  exports: [RagContextService],
})
export class RagModule {}
