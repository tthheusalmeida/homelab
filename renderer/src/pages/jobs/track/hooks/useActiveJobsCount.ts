import { isActiveJob } from "../active";

import { useJobs } from "./useJobs";

/** Quantos jobs estão na fila ou rodando agora (o contador da barra lateral). Compartilha a consulta da tela de tarefas. */
export function useActiveJobsCount(): number {
  const { data } = useJobs();

  return data?.filter(isActiveJob).length ?? 0;
}
