import type { JobDeleteResult } from "#shared/contracts/jobs";

import { TrackStrings } from "./strings";

/** Mensagem do snackbar depois de excluir: quantos saíram e quantos ficaram por estarem ativos. */
export function describeDeleteResult(result: JobDeleteResult): string {
  const active = result.skipped.filter((item) => item.reason === "ACTIVE").length;
  const kept = active > 0 ? TrackStrings.keptActive(active) : null;

  if (result.deleted.length === 0) {
    return kept ?? TrackStrings.nothingDeleted;
  }

  const deleted = TrackStrings.deleted(result.deleted.length);

  return kept ? `${deleted}. ${kept}.` : deleted;
}
