import {
  JobTypeIds,
  type JobResume,
  type JobTypeView,
  type JobView,
} from '../shared/contracts/jobs';

/** Parte do `JobService` do back usada para consultar jobs. */
export interface JobStore {
  findAll(): unknown[];
  findById(id: string): unknown;
}

/**
 * O `Job` do back é uma entidade com getters e `toJSON`; o IPC copia só propriedades próprias. Passar
 * por JSON dá exatamente o que o `GET jobs` devolvia (datas em texto ISO, sem os campos privados).
 */
export function toWire<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Consulta de jobs e dos tipos de job, já no formato de transporte. */
export class JobCatalog {
  constructor(
    private readonly store: JobStore,
    /** Configuração dos tipos (`JobTypeConfig` do back), lida só quando pedida. */
    private readonly typeConfig: () => Record<string, unknown>,
    /** Progresso em disco de um resumo de PDF (pela chave); `null` se não há. */
    private readonly resumeOf?: (checkpointKey: string) => JobResume | null,
  ) {}

  list(): JobView[] {
    return this.store.findAll().map((job) => this.view(job));
  }

  get(id: string): JobView {
    return this.view(this.store.findById(id));
  }

  /** O job no formato de transporte; resumo de PDF que falhou leva quantas partes já estão salvas. */
  private view(job: unknown): JobView {
    const view = toWire<JobView>(job);

    if (view.name === JobTypeIds.PDF_TO_SUMMARY && view.status === 'failed' && this.resumeOf) {
      const key = (job as { request?: { checkpointKey?: unknown } }).request?.checkpointKey;
      const resume = typeof key === 'string' ? this.resumeOf(key) : null;

      if (resume) {
        view.resume = resume;
      }
    }

    return view;
  }

  listTypes(): JobTypeView[] {
    return Object.values(this.typeConfig()).map((config) => toWire<JobTypeView>(config));
  }
}
