import { AIService } from '../back/modules/ai/ai.service';
import { AiUsageService } from '../back/modules/ai/usage/ai-usage.service';
import { ChatService } from '../back/modules/chat/chat.service';
import { HealthAIService } from '../back/modules/health/ai/health-ai.service';
import { HealthSystemService } from '../back/modules/health/system/health-system.service';
import { JobRunner } from '../back/modules/jobs/application/job-runner.service';
import { JobService } from '../back/modules/jobs/application/job.service';
import { parseDocumentHints } from '../back/modules/jobs/domain/document-hints';
import { JobTypeConfig } from '../back/modules/jobs/jobs.types';
import { VideoToSummaryJobProcessor } from '../back/modules/jobs/processors/video-to-resume/processor';
import { VideoToTranscriptJobProcessor } from '../back/modules/jobs/processors/video-to-transcript/processor';
import { BookService } from '../back/modules/library/application/book.service';
import { LibraryClassifier } from '../back/modules/library/application/library-classifier';
import { LibraryService } from '../back/modules/library/application/library.service';
import type { BackupCollection } from '../backup/backup.service';
import type { BackReaders } from '../ipc/handlers';
import { JobCatalog } from '../jobs/job-catalog';
import { JobLauncher } from '../jobs/job-launcher';
import type { LocalAiPort } from '../updates/release-notes-translator';

/** Obtém a instância de um service do contêiner do back. */
export type ServiceResolver = <T>(token: unknown) => T;

/**
 * Entrega os services do back (as instâncias do contêiner Nest) aos handlers IPC, cada um pela
 * porta mínima que o handler declara, e monta o catálogo e o lançador de jobs.
 */
export class BackServices {
  constructor(private readonly get: ServiceResolver) {}

  readers(): BackReaders {
    return {
      healthSystem: this.get(HealthSystemService),
      healthAi: this.get(HealthAIService),
      ai: this.get(AIService),
      aiUsage: this.get(AiUsageService),
      chat: this.get(ChatService),
      library: this.get(LibraryService),
      libraryClassifier: this.get(LibraryClassifier),
      books: this.get(BookService),
      jobs: this.jobs(),
    };
  }

  /** O serviço de IA do back, só pela porta que o tradutor de notas usa (Ollama). */
  localAi(): LocalAiPort {
    return this.get<AIService>(AIService);
  }

  /** Jobs, chats e consumo de IA como coleções que o backup exporta e importa (usa os serviços vivos). */
  backupCollections(): {
    jobs: BackupCollection;
    chats: BackupCollection;
    usage: BackupCollection;
  } {
    const jobs = this.get<JobService>(JobService);
    const chats = this.get<ChatService>(ChatService);
    const usage = this.get<AiUsageService>(AiUsageService);

    return {
      jobs: {
        export: () => jobs.exportSnapshots(),
        import: (items, mode) => jobs.importSnapshots(items, mode),
      },
      chats: {
        export: () => chats.exportChats(),
        import: (items, mode) => chats.importChats(items, mode),
      },
      usage: {
        export: () => usage.exportRecords(),
        import: (items, mode) => usage.importRecords(items, mode),
      },
    };
  }

  /** Reconstrói o índice da biblioteca (depois de uma restauração de páginas e livros). */
  reindexLibrary(): Promise<unknown> {
    return this.get<LibraryService>(LibraryService).reindex();
  }

  /** Catálogo e lançador de jobs, montados com as instâncias do `JobsModule`. */
  private jobs(): BackReaders['jobs'] {
    return {
      catalog: new JobCatalog(this.get(JobService), () => JobTypeConfig),
      deleter: this.get(JobService),
      canceller: this.get(JobRunner),
      launcher: new JobLauncher({
        jobs: this.get(JobService),
        runner: this.get(JobRunner),
        transcriptProcessor: this.get(VideoToTranscriptJobProcessor),
        summaryProcessor: this.get(VideoToSummaryJobProcessor),
        parseHints: (raw) => parseDocumentHints(raw as Parameters<typeof parseDocumentHints>[0]),
      }),
    };
  }
}
