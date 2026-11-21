import { Injectable } from '@nestjs/common';

import { Job, JobCancelledError } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';
import { retryNote } from '../../domain/retry-note';

import { AIService } from '../../../ai/ai.service';
import {
  buildSummaryPrompt,
  DEFAULT_SUMMARY_DETAIL,
  isSummaryDetail,
} from '../../../ai/prompts/summary-specialist.prompt';
import { DocumentSourceOptions, DocumentTypeOptions } from '../../../library/domain/library.types';
import { newPendingMeta } from '../../../library/domain/document';
import { serializeDocument } from '../../../library/domain/frontmatter';
import { buildBaseName } from '../../../library/domain/naming';
import { LibraryClassifier } from '../../../library/application/library-classifier';
import {
  PdfCheckpointStore,
  type CheckpointManifest,
  type CheckpointPage,
} from '../../../pdf/pdf-checkpoint.store';
import { buildPageDigest, PAGE_DIGEST_CHARS } from '../../../pdf/pdf-digest';
import { VideoService } from '../../../video/video.service';

import { PdfToSummaryDto } from './dto/pdf-to-summary.dto';
import { PdfToSummarySteps } from './steps';

type ManifestPart = CheckpointManifest['parts'][number];

export const PdfJobMessages = {
  missingProgress:
    'O texto deste PDF não está mais guardado no app (a pasta de progresso foi apagada). ' +
    'Escolha o arquivo de novo para criar outra tarefa.',
  fillFailed: (reason: string): string =>
    `Todas as partes foram resumidas, mas não foi possível preencher título, categoria e tags da página.${reason ? ` ${reason}` : ''} ` +
    'Os resumos estão salvos: use "Tentar de novo" para repetir só esta etapa (dá para trocar o modelo).',
  partFailed: (part: number, total: number, done: number, reason: string): string =>
    `Falha ao resumir a parte ${part} de ${total}.${reason ? ` ${reason}` : ''} ` +
    `${done} de ${total} partes já estão salvas: use "Tentar de novo" para continuar de onde parou.`,
  partNote: (part: number, total: number, resumed: number): string =>
    resumed > 0
      ? `Resumindo a parte ${part} de ${total} (retomado: ${resumed} já estavam prontas)`
      : `Resumindo a parte ${part} de ${total}`,
} as const;

/** Nome do arquivo sem a extensão `.pdf`, usado como título quando o usuário não informa um. */
export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').trim() || 'Resumo de PDF';
}

@Injectable()
export class PdfToSummaryJobProcessor implements JobProcessor<PdfToSummaryDto, string> {
  constructor(
    private readonly aiService: AIService,
    private readonly videoService: VideoService,
    private readonly checkpoints: PdfCheckpointStore,
    private readonly classifier: LibraryClassifier,
  ) {}

  async process(job: Job, input: PdfToSummaryDto): Promise<void> {
    const manifest = await this.readPdf(job, input.checkpointKey);
    const summaries = await this.summarizeParts(job, input, manifest);

    const page = await this.fillPage(job, input, summaries);

    await this.saveFile(job, input, summaries, page);
    await this.cleanUp(job, input.checkpointKey);
  }

  private async readPdf(job: Job, key: string): Promise<CheckpointManifest> {
    return job.runStep(PdfToSummarySteps.READ_PDF.name, async () => {
      const manifest = await this.checkpoints.load(key);

      if (!manifest) {
        throw new Error(PdfJobMessages.missingProgress);
      }

      return manifest;
    });
  }

  /**
   * Resume as partes em ordem. Cada resumo é gravado em disco assim que fica pronto; as partes que
   * já têm resumo (de uma execução anterior que parou no meio) são lidas do disco, sem chamar a IA.
   */
  private async summarizeParts(
    job: Job,
    input: PdfToSummaryDto,
    manifest: CheckpointManifest,
  ): Promise<string[]> {
    return job.runStep(PdfToSummarySteps.SUMMARIZE_PARTS.name, async () => {
      const key = input.checkpointKey;
      const total = manifest.parts.length;
      const resumed = (await this.checkpoints.progress(key))?.done ?? 0;
      const detail = isSummaryDetail(input.detail) ? input.detail : DEFAULT_SUMMARY_DETAIL;
      const prompt = buildSummaryPrompt(detail);
      const summaries: string[] = [];

      for (const part of manifest.parts) {
        // cancelar vale entre as partes: o que já ficou pronto continua salvo
        if (job.cancelRequested) {
          throw new JobCancelledError();
        }

        const saved = await this.checkpoints.readSummary(key, part.index);

        if (saved !== null) {
          summaries.push(saved);
          continue;
        }

        const note = PdfJobMessages.partNote(part.index + 1, total, resumed);

        job.setNote(note);

        const summary = await this.summarizePart({
          job,
          input,
          prompt,
          text: await this.checkpoints.readPart(key, part.index),
          part,
          total,
          covered: this.headingsOf(summaries),
          note,
        });

        await this.checkpoints.saveSummary(key, part.index, summary);
        summaries.push(summary);
      }

      return summaries;
    });
  }

  private async summarizePart(args: {
    job: Job;
    input: PdfToSummaryDto;
    prompt: string;
    text: string;
    part: ManifestPart;
    total: number;
    covered: string[];
    note: string;
  }): Promise<string> {
    const { job, input, prompt, text, part, total, covered, note } = args;

    try {
      return await this.aiService.chat({
        providerId: input.providerId,
        modelId: input.modelId,
        thinking: input.thinking ?? 'off',
        // Enquanto a IA tenta de novo, a tela mostra "tentativa x de y" junto da parte.
        onRetry: (info) => job.setNote(`${note} — ${retryNote(info)}`),
        message: `
      ${prompt}
      ${this.partIntro(part, total, covered)}${text}
      `,
      });
    } catch (error) {
      const done = (await this.checkpoints.progress(input.checkpointKey))?.done ?? 0;
      const reason = error instanceof Error ? error.message : '';

      throw new Error(PdfJobMessages.partFailed(part.index + 1, total, done, reason), {
        cause: error,
      });
    }
  }

  private partIntro(part: ManifestPart, total: number, covered: string[]): string {
    if (total <= 1) {
      return '';
    }

    const pages =
      part.startPage === part.endPage
        ? `página ${part.startPage}`
        : `páginas ${part.startPage} a ${part.endPage}`;
    const intro = `Esta é a parte ${part.index + 1} de ${total} de um mesmo documento (${pages}). Resuma somente esta parte; as outras são resumidas separadamente.`;

    if (part.index === 0) {
      return `${intro}\n\n`;
    }

    const continuation = covered.length
      ? ` Seções já resumidas nas partes anteriores: ${covered.join('; ')}. Se esta parte continuar um desses assuntos, não repita o título nem as definições já dadas: acrescente só o que for novo.`
      : '';

    return `${intro} Não repita o título principal: comece direto pelas seções (##).${continuation}\n\n`;
  }

  /** Títulos (##) já gerados nas partes anteriores, para a próxima não repeti-los. */
  private headingsOf(parts: string[]): string[] {
    return parts
      .join('\n')
      .split('\n')
      .filter((line) => /^##\s+\S/.test(line))
      .map((line) => line.replace(/^##\s+/, '').trim());
  }

  /**
   * Passada final: a IA lê uma amostra dos resumos e sugere título, categoria e tags, **preferindo o
   * que a biblioteca já tem**. O que o usuário preencheu na criação vale mais e nunca é trocado; se
   * ele preencheu os três, a IA nem é chamada. O resultado é guardado em disco: uma nova tentativa
   * depois de uma falha não gasta a chamada de novo.
   */
  private async fillPage(
    job: Job,
    input: PdfToSummaryDto,
    summaries: string[],
  ): Promise<CheckpointPage> {
    return job.runStep(PdfToSummarySteps.FILL_PAGE.name, async () => {
      const hints = job.documentHints;
      const fileTitle = titleFromFileName(input.fileName);
      const chosen = {
        title: hints.title,
        category: hints.category,
        tags: hints.tags,
      };

      if (chosen.title && chosen.category?.length && chosen.tags?.length) {
        return { title: chosen.title, category: chosen.category, tags: chosen.tags };
      }

      const suggested =
        (await this.checkpoints.readPage(input.checkpointKey)) ??
        (await this.suggestPage(job, input, summaries, chosen.title ?? fileTitle));

      return {
        title: chosen.title ?? (suggested.title || fileTitle),
        category: chosen.category?.length ? chosen.category : suggested.category,
        tags: chosen.tags?.length ? chosen.tags : suggested.tags,
      };
    });
  }

  private async suggestPage(
    job: Job,
    input: PdfToSummaryDto,
    summaries: string[],
    title: string,
  ): Promise<CheckpointPage> {
    job.setNote('Preenchendo título, categoria e tags');

    try {
      const suggestion = await this.classifier.classify({
        title,
        content: buildPageDigest(summaries),
        maxContentChars: PAGE_DIGEST_CHARS,
        providerId: input.providerId,
        modelId: input.modelId,
        thinking: input.thinking ?? 'off',
        onRetry: (info) => job.setNote(`Preenchendo título, categoria e tags — ${retryNote(info)}`),
      });
      const page = {
        title: suggestion.title,
        category: suggestion.category,
        tags: suggestion.tags,
      };

      await this.checkpoints.savePage(input.checkpointKey, page);

      return page;
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';

      throw new Error(PdfJobMessages.fillFailed(reason), { cause: error });
    }
  }

  private async saveFile(
    job: Job,
    input: PdfToSummaryDto,
    summaries: string[],
    page: CheckpointPage,
  ): Promise<string> {
    const meta = newPendingMeta({
      id: job.id,
      title: page.title,
      type: DocumentTypeOptions.SUMMARY,
      source: DocumentSourceOptions.PDF,
      category: page.category,
      tags: page.tags,
    });

    return job.runStep(PdfToSummarySteps.SAVE_FILE.name, () =>
      this.videoService.saveFile(
        serializeDocument(meta, summaries.join('\n\n')),
        buildBaseName(meta.title, job.id),
        '.md',
      ),
    );
  }

  /** Só depois de o resumo estar salvo na inbox a pasta de progresso pode ser apagada. */
  private async cleanUp(job: Job, key: string): Promise<void> {
    return job.runStep(PdfToSummarySteps.CLEAN_UP.name, () => this.checkpoints.remove(key));
  }
}
