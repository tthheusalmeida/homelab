import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { LIBRARY_KEY } from "../../../library/hooks/useLibrary";
import type { Job } from "../../types/job.types";
import { useJobs } from "./useJobs";

/** Ids dos jobs que terminaram com sucesso. */
export function completedJobIds(jobs: Job[]): Set<string> {
  return new Set(jobs.filter((job) => job.status === "completed").map((job) => job.id));
}

/** Algum job terminou desde a última olhada (a primeira olhada só marca o que já existia). */
export function hasNewCompletion(previous: Set<string> | null, current: Set<string>): boolean {
  if (previous === null) {
    return false;
  }

  return [...current].some((id) => !previous.has(id));
}

/**
 * Quando um job termina, o documento que ele gerou acaba de entrar na caixa de entrada. Este gancho
 * (usado na barra lateral, sempre montada) acompanha a lista de jobs e, ao ver um job novo
 * concluído, atualiza a biblioteca na hora: o contador da Classificação sobe sem precisar abrir
 * a tela.
 */
export function useRefreshLibraryOnJobDone(): void {
  const { data } = useJobs();
  const queryClient = useQueryClient();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    const completed = completedJobIds(data);

    if (hasNewCompletion(seen.current, completed)) {
      void queryClient.invalidateQueries({ queryKey: LIBRARY_KEY });
    }

    seen.current = completed;
  }, [data, queryClient]);
}
