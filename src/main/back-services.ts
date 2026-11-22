import { AIService } from '../back/modules/ai/ai.service';
import { AiUsageService } from '../back/modules/ai/usage/ai-usage.service';
import { ChatService } from '../back/modules/chat/chat.service';
import { HealthAIService } from '../back/modules/health/ai/health-ai.service';
import { HealthSystemService } from '../back/modules/health/system/health-system.service';
import { JobRunner } from '../back/modules/jobs/application/job-runner.service';
import { JobService } from '../back/modules/jobs/application/job.service';
import { parseDocumentHints } from '../back/modules/jobs/domain/document-hints';
import { JobTypeConfig } from '../back/modules/jobs/jobs.types';
import { PdfToSummaryJobProcessor } from '../back/modules/jobs/processors/pdf-to-summary/processor';
import { VideoToSummaryJobProcessor } from '../back/modules/jobs/processors/video-to-resume/processor';
import { PdfCheckpointStore } from '../back/modules/pdf/pdf-checkpoint.store';
import { VideoToTranscriptJobProcessor } from '../back/modules/jobs/processors/video-to-transcript/processor';
import { BookService } from '../back/modules/library/application/book.service';
import { LibraryClassifier } from '../back/modules/library/application/library-classifier';
import { InfographicService } from '../back/modules/library/application/infographic.service';
import { PromptService } from '../back/modules/ai/prompts/prompt.service';
import { PromptStore } from '../back/modules/ai/prompts/prompt.store';
import { MindMapService } from '../back/modules/library/application/mind-map.service';
import { LibraryService } from '../back/modules/library/application/library.service';
import { InfographicStore } from '../back/modules/library/infrastructure/infographic-store';
import { MindMapStore } from '../back/modules/library/infrastructure/mind-map-store';
import type { BackupCollection } from '../backup/backup.service';
import type { BackReaders } from '../ipc/handlers';
import { JobCatalog } from '../jobs/job-catalog';
import { JobLauncher } from '../jobs/job-launcher';
import { LeftoverCleaner } from '../jobs/leftover-cleaner';
import { BackConfig } from '../back/config/back-config';
import { JobStatus } from '../back/modules/jobs/domain/job-status.enum';
import { PdfJobPreparer } from '../pdf/pdf-job-preparer';
import { PdfSessionStore } from '../pdf/pdf-session.store';
import type { LocalAiPort } from '../updates/release-notes-translator';

/** Obtém a instância de um service do contêiner do back. */
export type ServiceResolver = <T>(token: unknown) => T;

/**
 * Entrega os services do back (as instâncias do contêiner Nest) aos handlers IPC, cada um pela
 * porta mínima que o handler declara, e monta o catálogo e o lançador de jobs.
 */
export class BackServices {
  constructor(
    private readonly get: ServiceResolver,
    /** Textos de PDF lidos e ainda não transformados em job (os mesmos de `pdf:inspect`). */
    private readonly pdfSessions: PdfSessionStore = new PdfSessionStore(),
  ) {}

  readers(): BackReaders {
    return {
      healthSystem: this.get(HealthSystemService),
      healthAi: this.get(HealthAIService),
      ai: this.get(AIService),
      aiUsage: this.get(AiUsageService),
      chat: this.get(ChatService),
      library: this.get(LibraryService),
      libraryClassifier: this.get(LibraryClassifier),
      mindMaps: this.get(MindMapService),
      infographics: this.get(InfographicService),
      prompts: this.get(PromptService),
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
    mindMaps: BackupCollection;
    infographics: BackupCollection;
    prompts: BackupCollection;
    usage: BackupCollection;
  } {
    const jobs = this.get<JobService>(JobService);
    const chats = this.get<ChatService>(ChatService);
    const usage = this.get<AiUsageService>(AiUsageService);
    const mindMaps = this.get<MindMapStore>(MindMapStore);
    const infographics = this.get<InfographicStore>(InfographicStore);
    const prompts = this.get<PromptStore>(PromptStore);

    return {
      jobs: {
        export: () => jobs.exportSnapshots(),
        import: (items, mode) => jobs.importSnapshots(items, mode),
      },
      chats: {
        export: () => chats.exportChats(),
        import: (items, mode) => chats.importChats(items, mode),
      },
      mindMaps: {
        export: () => mindMaps.exportAll(),
        import: (items, mode) => mindMaps.importAll(items, mode),
      },
      infographics: {
        export: () => infographics.exportAll(),
        import: (items, mode) => infographics.importAll(items, mode),
      },
      prompts: {
        export: () => prompts.exportAll(),
        import: (items, mode) => prompts.importAll(items, mode),
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
    const checkpoints = this.get<PdfCheckpointStore>(PdfCheckpointStore);
    return {
      catalog: new JobCatalog(
        this.get(JobService),
        () => JobTypeConfig,
        (key) => checkpoints.progressSync(key),
      ),
      deleter: this.get(JobService),
      canceller: this.get(JobRunner),
      leftovers: new LeftoverCleaner({
        activeJobs: () =>
          this.get<JobService>(JobService)
            .findAll()
            .filter((job) => job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING)
            .map((job) => ({ id: job.id, request: job.request })),
        dirs: () => {
          const config = this.get<BackConfig>(BackConfig);

          return {
            pdfWorkDir: config.pdfWorkDir,
            mediaDirs: [config.videoTempDir, config.audioTempDir],
          };
        },
      }),
      launcher: new JobLauncher({
        jobs: this.get(JobService),
        runner: this.get(JobRunner),
        transcriptProcessor: this.get(VideoToTranscriptJobProcessor),
        summaryProcessor: this.get(VideoToSummaryJobProcessor),
        pdfProcessor: this.get(PdfToSummaryJobProcessor),
        pdf: new PdfJobPreparer({ sessions: this.pdfSessions, checkpoints }),
        parseHints: (raw) => parseDocumentHints(raw as Parameters<typeof parseDocumentHints>[0]),
      }),
    };
  }
}
