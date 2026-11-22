import { IpcChannels } from '../../shared/channels';
import type {
  PromptActivateRequest,
  PromptDeleteRequest,
  PromptSaveRequest,
  PromptsOverview,
} from '../../shared/contracts/prompts';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `PromptService` do back (prompts de IA que o usuário personaliza). */
export interface PromptsPort {
  overview(): PromptsOverview;
  save(request: PromptSaveRequest): PromptsOverview;
  delete(request: PromptDeleteRequest): PromptsOverview;
  activate(request: PromptActivateRequest): PromptsOverview;
}

/**
 * Canais `prompts:*`. Cada um devolve a visão completa já atualizada (padrões, versões e qual está
 * em uso), então a tela só troca o que mostra. Os limites do texto (muito curto, muito longo, nome
 * repetido) são conferidos pelo service e chegam como `VALIDATION`; versão que não existe, como
 * `NOT_FOUND`, pelo `IpcErrorMapper`.
 */
export class PromptsHandler extends IpcHandler {
  constructor(private readonly prompts: PromptsPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.prompts.list, () => this.prompts.overview()),
      this.route(IpcChannels.prompts.save, (request: PromptSaveRequest) =>
        this.prompts.save(request),
      ),
      this.route(IpcChannels.prompts.delete, (request: PromptDeleteRequest) =>
        this.prompts.delete(request),
      ),
      this.route(IpcChannels.prompts.activate, (request: PromptActivateRequest) =>
        this.prompts.activate(request),
      ),
    ];
  }
}
