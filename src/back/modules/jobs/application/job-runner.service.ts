// application/job-runner.service.ts

import { Injectable, Inject, Optional } from '@nestjs/common';

import { BackAlerts } from '../../../config/back-alerts';

import type { JobCancelResult } from '../../../../shared/contracts/jobs';
import { CANCELLED_JOB_ERROR, Job } from '../domain/job.entity';
import { JobStatus } from '../domain/job-status.enum';
import { ACCESS_REQUIRED_CODE, AccessRequiredError } from '../../video/access-required.error';
import { JobProcessor } from '../domain/job-processor.interface';
import { LibraryService } from '../../library/application/library.service';

import { JOB_REPOSITORY } from '../infrastructure/repositories/job.repository';
import type { JobRepository } from '../infrastructure/repositories/job.repository';

@Injectable()
export class JobRunner {
  private queue: Array<{
    job: Job;
    processor: JobProcessor<any, any>;
    input: any;
  }> = [];

  private running = false;
  private current: Job | null = null;

  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly repository: JobRepository,
    @Optional() private readonly alerts?: BackAlerts,
    /** Reindexa a biblioteca quando um job termina: o que ele gerou já aparece na Classificação. */
    @Optional() private readonly library?: LibraryService,
  ) {}

  run<TInput, TResult>(job: Job, processor: JobProcessor<TInput, TResult>, input: TInput): void {
    this.queue.push({
      job,
      processor,
      input,
    });

    void this.processQueue();
  }

  /**
   * Cancela um job. Na fila: sai dela e termina como falha "Cancelado pelo usuário". Rodando: o
   * cancelamento é pedido e o job para ao fim da etapa em andamento (download, ffmpeg, Whisper e IA
   * não são interrompidos no meio).
   */
  cancel(id: string): JobCancelResult {
    const index = this.queue.findIndex((item) => item.job.id === id);

    if (index >= 0) {
      const [{ job }] = this.queue.splice(index, 1);

      job.fail(CANCELLED_JOB_ERROR);
      this.repository.save(job);

      return { id, outcome: 'cancelled' };
    }

    if (this.current?.id === id) {
      this.current.requestCancel();
      this.repository.save(this.current);

      return { id, outcome: 'cancelling' };
    }

    return { id, outcome: 'not-active' };
  }

  private async processQueue(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      await this.execute(item.job, item.processor, item.input);
    }

    this.running = false;
  }

  private async execute<TInput, TResult>(
    job: Job,
    processor: JobProcessor<TInput, TResult>,
    input: TInput,
  ): Promise<void> {
    this.current = job;
    // Cada etapa que começa ou termina é gravada: fechar o app não perde o que já ficou pronto.
    job.observe(() => this.repository.save(job));

    try {
      job.start();
      this.repository.save(job);

      await processor.process(job, input);
      await this.refreshLibrary();

      job.complete();
      this.repository.save(job);
      this.notify(job);
    } catch (error) {
      if (error instanceof AccessRequiredError) {
        job.fail(error.message, { code: ACCESS_REQUIRED_CODE, url: error.url });
      } else {
        job.fail(error instanceof Error ? error.message : 'Erro desconhecido');
      }

      this.repository.save(job);

      // cancelar foi escolha do usuário: não vale um aviso de falha
      if (!job.cancelRequested) {
        this.notify(job);
      }
    } finally {
      job.observe(undefined);
      this.current = null;
    }
  }

  /**
   * Todo job pode ter gravado um documento novo na entrada. Reindexar antes de marcar o job como
   * concluído garante que, quando a tela vê "concluído", o contador da Classificação já está certo.
   * Falhar aqui não derruba o job: o arquivo está salvo e a próxima sincronização o enxerga.
   */
  private async refreshLibrary(): Promise<void> {
    try {
      await this.library?.reindex();
    } catch {
      // o documento já está salvo; a biblioteca o vê na próxima sincronização
    }
  }

  /** Avisa o usuário que o job terminou; um problema ao avisar nunca atrapalha a fila. */
  private notify(job: Job): void {
    try {
      this.alerts?.jobFinished({
        id: job.id,
        label: job.label ?? job.name ?? 'Processo',
        status: job.status === JobStatus.COMPLETED ? 'completed' : 'failed',
        error: job.error,
      });
    } catch {
      // aviso é um extra: não pode derrubar o processamento
    }
  }
}
