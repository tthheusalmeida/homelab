import type { JobTypeView, JobView } from '../shared/contracts/jobs';

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
  ) {}

  list(): JobView[] {
    return toWire<JobView[]>(this.store.findAll());
  }

  get(id: string): JobView {
    return toWire<JobView>(this.store.findById(id));
  }

  listTypes(): JobTypeView[] {
    return Object.values(this.typeConfig()).map((config) => toWire<JobTypeView>(config));
  }
}
