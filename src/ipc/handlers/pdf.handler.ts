import { IpcChannels } from '../../shared/channels';
import type { PdfInspection } from '../../shared/contracts/pdf';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `PdfInspector`. */
export interface PdfPort {
  inspect(): Promise<PdfInspection | null>;
  cancel(): void;
}

/**
 * Canais `pdf:*`. O renderer nunca manda caminho: o main abre o diálogo de arquivo e identifica o
 * PDF lido por um token. Problemas do arquivo (grande demais, protegido, sem texto) chegam como
 * `VALIDATION` com a mensagem para o usuário.
 */
export class PdfHandler extends IpcHandler {
  constructor(private readonly pdf: PdfPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.pdf.inspect, () => this.pdf.inspect()),
      this.route(IpcChannels.pdf.cancel, () => this.pdf.cancel()),
    ];
  }
}
