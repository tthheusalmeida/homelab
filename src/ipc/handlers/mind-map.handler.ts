import { IpcChannels } from '../../shared/channels';
import type {
  LibraryMindMap,
  LibraryMindMapImageResult,
  LibraryMindMapNode,
  LibraryMindMapRequest,
} from '../../shared/contracts/library';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `MindMapService` do back (mapa mental de revisão do resumo, gerado pela IA). */
export interface MindMapPort {
  get(id: string): Promise<LibraryMindMap | null>;
  generate(id: string, modelId?: string): Promise<LibraryMindMap>;
  /** Apaga só o mapa mental da página (o resumo e o infográfico ficam). */
  delete(id: string): Promise<void>;
  /** Guarda o mapa como o usuário o editou. */
  save(
    id: string,
    input: { subtitle?: string; nodes: LibraryMindMapNode[] },
  ): Promise<LibraryMindMap>;
}

/** Salva a imagem PNG do mapa onde o usuário escolher (diálogo do sistema, no main). */
export interface MindMapImagePort {
  save(fileName: string, dataBase64: string): Promise<LibraryMindMapImageResult>;
}

export const MindMapPayloadMessages = {
  nodes: 'Informe os ramos do mapa mental.',
  image: 'Informe o nome e o conteúdo da imagem.',
} as const;

/**
 * Canais `library:mind-map:*`. Página inexistente chega como `NOT_FOUND`, página que não é resumo
 * como `VALIDATION` e falha da IA como `PROVIDER_FAILED`, todos pelo `IpcErrorMapper`. O
 * `save` confere só que os ramos são uma lista (o resto é validado e cortado pelo service); o
 * `save-image` confere só que nome e conteúdo são textos; o resto (é um PNG?) é do `images`.
 */
export class MindMapHandler extends IpcHandler {
  constructor(
    private readonly mindMaps: MindMapPort,
    private readonly images: MindMapImagePort,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.mindMap.get, ({ id }) => this.mindMaps.get(id)),
      this.route(IpcChannels.library.mindMap.delete, ({ id }) => this.mindMaps.delete(id)),
      this.route(IpcChannels.library.mindMap.generate, ({ id, modelId }: LibraryMindMapRequest) =>
        this.mindMaps.generate(id, modelId),
      ),
      this.route(IpcChannels.library.mindMap.save, ({ id, subtitle, nodes }) => {
        if (!Array.isArray(nodes)) {
          throw new IpcError(IpcErrorCode.VALIDATION, MindMapPayloadMessages.nodes);
        }

        return this.mindMaps.save(id, { subtitle, nodes });
      }),
      this.route(IpcChannels.library.mindMap.saveImage, ({ fileName, dataBase64 }) => {
        if (typeof fileName !== 'string' || typeof dataBase64 !== 'string' || dataBase64 === '') {
          throw new IpcError(IpcErrorCode.VALIDATION, MindMapPayloadMessages.image);
        }

        return this.images.save(fileName, dataBase64);
      }),
    ];
  }
}
