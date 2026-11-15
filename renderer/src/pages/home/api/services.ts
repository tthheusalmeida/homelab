import { ipc } from '#lib/ipc';
import type { IpcChannels } from '#shared/channels';

import type { HealthService } from '../types/services.types';

type HealthChannel = typeof IpcChannels.health.system | typeof IpcChannels.health.ai;

export function checkService(channel: HealthChannel): Promise<HealthService> {
  return ipc.invoke(channel);
}
