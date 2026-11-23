import type { Job } from "../../types/job.types";
import { isActiveJob } from "../active";

import { useJobsSelect } from "./useJobs";

const countActive = (jobs: Job[]) => jobs.filter(isActiveJob).length;

/** Quantos jobs estão na fila ou rodando agora (o contador da barra lateral). Compartilha a consulta da tela de tarefas. */
export function useActiveJobsCount(): number {
  const { data } = useJobsSelect(countActive);

  return data ?? 0;
}
