import { Job } from '../../domain/job.entity';

export const JOB_REPOSITORY = Symbol('JOB_REPOSITORY');

/** O que aconteceu com o histórico ao abrir o app (para avisar o usuário). */
export interface JobsStartupReport {
  /** Jobs que estavam na fila ou rodando quando o app fechou e viraram falha. */
  interrupted: string[];
  /** O arquivo principal estava ilegível e a cópia `.bak` foi usada. */
  recoveredFromBackup: boolean;
  /** Nem o arquivo nem a cópia puderam ser lidos: o histórico começou vazio. */
  unreadable: boolean;
}

export interface JobRepository {
  save(job: Job): void;

  findById(id: string): Job | null;

  findAll(): Job[];

  /** Remove os jobs e devolve os ids que existiam. Quem chama decide o que pode ser removido. */
  remove(ids: string[]): string[];

  startupReport(): JobsStartupReport;
}
