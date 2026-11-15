import { Module } from '@nestjs/common';

import { AIModule } from '../ai/ai.module';

import { BookService } from './application/book.service';
import { LibraryClassifier } from './application/library-classifier';
import { LibrarySearch } from './application/library-search';
import { LibraryService } from './application/library.service';
import { BookStorage } from './infrastructure/book-storage';
import { LibraryIndex } from './infrastructure/library-index';
import { LibraryStorage } from './infrastructure/library-storage';

@Module({
  imports: [AIModule],
  providers: [
    LibraryStorage,
    LibraryIndex,
    LibrarySearch,
    LibraryService,
    LibraryClassifier,
    BookStorage,
    BookService,
  ],
  exports: [LibraryStorage, LibraryIndex, LibraryService, LibraryClassifier, BookService],
})
export class LibraryModule {}
