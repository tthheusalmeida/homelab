import { IpcChannels } from '../../shared/channels';
import type { HealthReport } from '../../shared/contracts/health';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta de um health check do back (`HealthSystemService`, `HealthAIService`). */
export interface HealthCheckSource {
  check(): Promise<HealthReport>;
}

/** Canais `health:*`. Um provider fora do ar já vem como `error` no check, sem lançar. */
export class HealthHandler extends IpcHandler {
  constructor(
    private readonly system: HealthCheckSource,
    private readonly ai: HealthCheckSource,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.health.system, () => this.system.check()),
      this.route(IpcChannels.health.ai, () => this.ai.check()),
    ];
  }
}
