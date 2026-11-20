import { IpcChannels } from '../../shared/channels';
import type { LibraryInfographic, LibraryInfographicRequest } from '../../shared/contracts/library';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { isInfographicLayoutId } from '../../shared/infographic-layouts';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `InfographicService` do back (infográfico do resumo, gerado pela IA). */
export interface InfographicPort {
  get(id: string): Promise<LibraryInfographic | null>;
  generate(
    id: string,
    options: Pick<LibraryInfographicRequest, 'modelId' | 'layout'>,
  ): Promise<LibraryInfographic>;
  /** Apaga só o infográfico da página (o resumo e o mapa mental ficam). */
  delete(id: string): Promise<void>;
}

export const InfographicPayloadMessages = {
  layout: 'Modelo de infográfico desconhecido.',
} as const;

/**
 * Canais `library:infographic:*`. Página inexistente chega como `NOT_FOUND`, página que não é
 * resumo como `VALIDATION` e falha da IA como `PROVIDER_FAILED`, todos pelo `IpcErrorMapper`. O
 * modelo escolhido, se vier, precisa ser um dos conhecidos.
 */
export class InfographicHandler extends IpcHandler {
  constructor(private readonly infographics: InfographicPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.infographic.get, ({ id }) => this.infographics.get(id)),
      this.route(IpcChannels.library.infographic.delete, ({ id }) => this.infographics.delete(id)),
      this.route(
        IpcChannels.library.infographic.generate,
        ({ id, modelId, layout }: LibraryInfographicRequest) => {
          if (layout !== undefined && !isInfographicLayoutId(layout)) {
            throw new IpcError(IpcErrorCode.VALIDATION, InfographicPayloadMessages.layout);
          }

          return this.infographics.generate(id, { modelId, layout });
        },
      ),
    ];
  }
}
