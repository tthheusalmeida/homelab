import { IpcChannels } from '../../shared/channels';
import type {
  AiModelEntry,
  AiProviderEntry,
  AiPreference,
  AiProviderId,
  AiSelectionState,
  AiThinkingEntry,
  AiUsageReport,
} from '../../shared/contracts/ai';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `AIService` do back (só leitura). */
export interface AiCatalog {
  providersList(): AiProviderEntry[];
  models(providerId: AiProviderId): Promise<AiModelEntry[]>;
  thinking(providerId: AiProviderId, modelId: string): Promise<AiThinkingEntry[]>;
}

/** Porta do `AiUsageService` do back. */
export interface AiUsageSource {
  getUsage(provider?: AiProviderId): AiUsageReport;
}

/** Porta do `DefaultAiService` do back: qual IA vale para mapa mental, infográfico e sugestão. */
export interface AiSelectionPort {
  state(): AiSelectionState;
  setSession(preference: AiPreference | null): AiSelectionState;
}

/** Canais `ai:*`: providers, modelos, thinking e uso (leitura) e a IA em uso (padrão e troca da sessão). */
export class AiHandler extends IpcHandler {
  constructor(
    private readonly catalog: AiCatalog,
    private readonly usage: AiUsageSource,
    private readonly selection: AiSelectionPort,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.ai.providers, () => this.catalog.providersList()),
      this.route(IpcChannels.ai.models, ({ providerId }) => this.catalog.models(providerId)),
      this.route(IpcChannels.ai.thinking, ({ providerId, modelId }) =>
        this.catalog.thinking(providerId, modelId),
      ),
      this.route(IpcChannels.ai.usage, ({ provider }) => this.usage.getUsage(provider)),
      this.route(IpcChannels.ai.selection, () => this.selection.state()),
      this.route(IpcChannels.ai.session, ({ preference }) => this.selection.setSession(preference)),
    ];
  }
}
