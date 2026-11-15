import { IpcChannels } from '../../shared/channels';
import type {
  BackupCreateRequest,
  BackupCreateResult,
  BackupInspection,
  BackupPreview,
  BackupRestoreRequest,
  BackupRestoreResult,
} from '../../shared/contracts/backup';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `BackupService`. */
export interface BackupPort {
  preview(): Promise<BackupPreview>;
  create(request: BackupCreateRequest): Promise<BackupCreateResult>;
  cancel(): void;
  inspect(): Promise<BackupInspection | null>;
  restore(request: BackupRestoreRequest): Promise<BackupRestoreResult>;
}

/**
 * Canais `backup:*`. O renderer nunca manda caminhos: o main abre os diálogos de arquivo e identifica
 * o zip escolhido por um token. O progresso vai pelo evento `backup:progress`. Erros de validação
 * (zip inválido, item desconhecido) chegam como `VALIDATION` e falhas de disco como `PERSIST_FAILED`.
 */
export class BackupHandler extends IpcHandler {
  constructor(private readonly backup: BackupPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.backup.preview, () => this.backup.preview()),
      this.route(IpcChannels.backup.create, (request) => this.backup.create(request)),
      this.route(IpcChannels.backup.cancel, () => this.backup.cancel()),
      this.route(IpcChannels.backup.inspect, () => this.backup.inspect()),
      this.route(IpcChannels.backup.restore, (request) => this.backup.restore(request)),
    ];
  }
}
