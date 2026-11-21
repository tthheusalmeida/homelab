/** Quantos dos jobs interrompidos são resumos de PDF com progresso ainda salvo em disco. */
export function countResumablePdfJobs(
  jobIds: string[],
  requestOf: (id: string) => unknown,
  hasProgress: (checkpointKey: string) => boolean,
): number {
  return jobIds.filter((id) => {
    let request: { checkpointKey?: unknown } | undefined;

    try {
      request = requestOf(id) as { checkpointKey?: unknown } | undefined;
    } catch {
      return false;
    }

    return typeof request?.checkpointKey === 'string' && hasProgress(request.checkpointKey);
  }).length;
}
