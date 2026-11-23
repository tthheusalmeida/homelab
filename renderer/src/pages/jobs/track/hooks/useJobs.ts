import { useQuery } from "@tanstack/react-query";

import { isActiveJob } from "../active";
import { fetchJobs } from "../api/track";
import type { Job } from "../../types/job.types";

/** Com algo na fila ou rodando, o progresso é acompanhado a cada segundo. */
export const ACTIVE_JOBS_POLL_MS = 1_000;
/** Sem nada em andamento, a lista só precisa de uma olhada de vez em quando (criar e agir já a atualizam). */
export const IDLE_JOBS_POLL_MS = 5_000;

/** Intervalo da próxima consulta: rápido enquanto há job ativo (e até a primeira resposta), calmo depois. */
export function jobsRefetchInterval(jobs: Job[] | undefined): number {
  return !jobs || jobs.some(isActiveJob) ? ACTIVE_JOBS_POLL_MS : IDLE_JOBS_POLL_MS;
}

const jobsQuery = {
  queryKey: ["jobs"],
  queryFn: fetchJobs,
  refetchInterval: (query: { state: { data: Job[] | undefined } }) =>
    jobsRefetchInterval(query.state.data),
};

export function useJobs() {
  return useQuery(jobsQuery);
}

/**
 * Mesma consulta (e o mesmo polling) da lista, mas o componente só é redesenhado quando o valor
 * escolhido muda, não a cada resposta com progresso novo. Use para contadores e avisos.
 */
export function useJobsSelect<T>(select: (jobs: Job[]) => T) {
  return useQuery({ ...jobsQuery, select });
}
