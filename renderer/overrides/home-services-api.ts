import type { HealthService } from '@front/pages/home/types/services.types';

import { IpcChannels } from '../../src/shared/channels';
import { ipc } from '../ipc';

/**
 * Cópia de `front/src/pages/home/api/services.ts` com o corpo por IPC.
 * A Home ainda passa a URL de cada serviço (`.../health/system`); aqui ela escolhe o canal.
 */
const HEALTH_CHANNELS = [
  { pathSuffix: '/health/system', channel: IpcChannels.health.system },
  { pathSuffix: '/health/ai', channel: IpcChannels.health.ai },
] as const;

export const HomeServicesMessages = {
  unknownService: (url: string) => `Serviço desconhecido: ${url}`,
} as const;

export async function checkService(url: string): Promise<HealthService> {
  const target = HEALTH_CHANNELS.find(({ pathSuffix }) => url.endsWith(pathSuffix));

  if (!target) {
    throw new Error(HomeServicesMessages.unknownService(url));
  }

  return ipc.invoke(target.channel);
}
