import { Module } from '@nestjs/common';

import { LibraryModule } from '../library/library.module';

import { RagContextService } from './application/rag-context.service';
import { RagSearchService } from './application/rag-search.service';

@Module({
  imports: [LibraryModule],
  providers: [RagSearchService, RagContextService],
  exports: [RagContextService],
})
export class RagModule {}
