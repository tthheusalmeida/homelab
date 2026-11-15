import { uuidv7 } from 'uuidv7';
import { JobStatus } from './job-status.enum';
import { JobStep, JobTypeConfig } from '../jobs.types';
import type { DocumentHints } from './document-hints';

/** Texto gravado no job que estava em andamento quando o app foi fechado. */
export const INTERRUPTED_JOB_ERROR = 'Interrompido ao fechar o app.';

/** Job como vai para o disco: datas em texto ISO e as dicas do documento (que o `toJSON` não tem). */
export interface JobSnapshot {
  id: string;
  name: string;
  label: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  steps: JobStep[];
  documentHints: DocumentHints;
}

export class Job {
  public readonly id: string;
  public readonly createdAt: Date;

  private _label: string;
  private _name: string;
  private _status: JobStatus;
  private _startedAt?: Date;
  private _completedAt?: Date;
  private _error?: string;

  private _steps: JobStep[] = [];

  constructor(
    name: string,
    private readonly _documentHints: DocumentHints = {},
  ) {
    const jobTypeConfig = JobTypeConfig[name as keyof typeof JobTypeConfig];

    if (!jobTypeConfig) {
      throw Error(`Não há processo com o tipo '${name}' definido.`);
    }

    this.id = uuidv7();
    this.createdAt = new Date();

    this._label = jobTypeConfig.label;
    this._name = name;
    this._status = JobStatus.PENDING;

    this._steps = jobTypeConfig.steps.map((step) => ({
      ...step,
      status: JobStatus.PENDING,
    }));
  }

  /**
   * Recria um job gravado em disco. Não passa pelo construtor de propósito: o tipo do job pode já não
   * existir na configuração atual, e um histórico antigo precisa continuar legível.
   */
  static restore(snapshot: JobSnapshot): Job {
    const job = Object.create(Job.prototype) as Job;
    const toDate = (value?: string): Date | undefined => (value ? new Date(value) : undefined);

    Object.assign(job, {
      id: snapshot.id,
      createdAt: new Date(snapshot.createdAt),
      _label: snapshot.label,
      _name: snapshot.name,
      _status: snapshot.status,
      _startedAt: toDate(snapshot.startedAt),
      _completedAt: toDate(snapshot.completedAt),
      _error: snapshot.error,
      _steps: snapshot.steps.map((step) => ({ ...step })),
      _documentHints: structuredClone(snapshot.documentHints ?? {}),
    });

    return job;
  }

  /** Título, categoria e tags opcionais para o documento que o job gera. */
  get documentHints(): DocumentHints {
    return this._documentHints;
  }

  get label(): string | undefined {
    return this._label;
  }

  get name(): string | undefined {
    return this._name;
  }

  get status(): JobStatus {
    return this._status;
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get error(): string | undefined {
    return this._error;
  }

  get steps(): JobStep[] {
    return this._steps;
  }

  start(): void {
    if (this._status !== JobStatus.PENDING) {
      throw new Error(`Job "${this.id}" não pode ser iniciado com ${this._status}`);
    }

    this._status = JobStatus.RUNNING;
    this._startedAt = new Date();
  }

  complete(): void {
    if (this._status !== JobStatus.RUNNING) {
      throw new Error(`Job "${this.id}" não pode ser completado com ${this._status}`);
    }

    this._status = JobStatus.COMPLETED;
    this._completedAt = new Date();
  }

  fail(error: string): void {
    this._status = JobStatus.FAILED;
    this._error = error;
  }

  /** Job que não terminou antes de o app fechar: falha com o motivo e a etapa em andamento também. */
  interrupt(reason: string = INTERRUPTED_JOB_ERROR): void {
    for (const step of this._steps) {
      if (step.status === JobStatus.RUNNING) {
        step.status = JobStatus.FAILED;
      }
    }

    this._status = JobStatus.FAILED;
    this._error = reason;
  }

  startStep(name: string): void {
    const step = this.findStep(name);

    step.status = JobStatus.RUNNING;
  }

  completeStep(name: string): void {
    const step = this.findStep(name);

    step.status = JobStatus.COMPLETED;
  }

  failStep(name: string): void {
    const step = this.findStep(name);

    step.status = JobStatus.FAILED;
  }

  async runStep<T>(name: string, callback: () => Promise<T>): Promise<T> {
    this.startStep(name);

    try {
      const result = await callback();

      this.completeStep(name);

      return result;
    } catch (error) {
      this.failStep(name);

      throw error;
    }
  }

  private findStep(name: string): JobStep {
    const step = this._steps.find((step) => step.name === name);

    if (!step) {
      throw new Error(`Etapa "${name}" não existe no Job "${this.id}".`);
    }

    return step;
  }

  snapshot(): JobSnapshot {
    return {
      id: this.id,
      name: this._name,
      label: this._label,
      status: this._status,
      createdAt: this.createdAt.toISOString(),
      startedAt: this._startedAt?.toISOString(),
      completedAt: this._completedAt?.toISOString(),
      error: this._error,
      steps: this._steps.map((step) => ({ ...step })),
      documentHints: structuredClone(this._documentHints),
    };
  }

  toJSON() {
    return {
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      error: this.error,
      id: this.id,
      name: this.name,
      label: this.label,
      status: this.status,
      startedAt: this.startedAt,
      steps: this.steps,
    };
  }
}
