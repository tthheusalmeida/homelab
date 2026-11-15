import type { Job } from "../types/job.types";

/** Job na fila ou rodando: não pode ser excluído enquanto não terminar. */
export function isActiveJob(job: Pick<Job, "status">): boolean {
  return job.status === "pending" || job.status === "running";
}
