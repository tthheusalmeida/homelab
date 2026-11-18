import { IpcChannels } from '../../shared/channels';
import type {
  SetAutoCheckRequest,
  TranslatedNotes,
  TranslationAvailability,
  UpdateStatus,
} from '../../shared/contracts/updates';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import {
  TranslationUnavailableError,
  TranslatorMessages,
} from '../../updates/release-notes-translator';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

export const UpdatesHandlerMessages = {
  autoCheckInvalid: 'Valor inválido para a verificação automática.',
  noNotes: 'Não há notas de versão para traduzir.',
} as const;

function parseAutoCheck(request: SetAutoCheckRequest | undefined): boolean {
  if (typeof request?.autoCheck !== 'boolean') {
    throw new IpcError(IpcErrorCode.VALIDATION, UpdatesHandlerMessages.autoCheckInvalid);
  }

  return request.autoCheck;
}

/** Porta do `AppUpdater`. */
export interface UpdatesPort {
  status(): UpdateStatus;
  check(): Promise<UpdateStatus>;
  install(): Promise<UpdateStatus>;
  setAutoCheck(autoCheck: boolean): UpdateStatus;
}

/** Porta do `ReleaseNotesTranslator` (tradução das notas com a IA local). */
export interface NotesTranslatorPort {
  available(): Promise<boolean>;
  translate(version: string, notes: string): Promise<string>;
}

/**
 * Canais `updates:*`. O renderer só pede ações; endereços, versões e checksums ficam no main. O
 * andamento (nova versão, download, erro) chega pelo evento `updates:changed`.
 */
export class UpdatesHandler extends IpcHandler {
  constructor(
    private readonly updates: UpdatesPort,
    private readonly translator: NotesTranslatorPort,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.updates.status, () => this.updates.status()),
      this.route(IpcChannels.updates.check, () => this.updates.check()),
      this.route(IpcChannels.updates.install, () => this.updates.install()),
      this.route(IpcChannels.updates.setAutoCheck, (request) =>
        this.updates.setAutoCheck(parseAutoCheck(request)),
      ),
      this.route(
        IpcChannels.updates.translationAvailable,
        async (): Promise<TranslationAvailability> => ({
          available: await this.translator.available(),
        }),
      ),
      this.route(IpcChannels.updates.translateNotes, () => this.translateNotes()),
    ];
  }

  /** Traduz as notas da versão que o app já conhece (o texto nunca vem do renderer). */
  private async translateNotes(): Promise<TranslatedNotes> {
    const latest = this.updates.status().latest;

    if (!latest || !latest.notes.trim()) {
      throw new IpcError(IpcErrorCode.VALIDATION, UpdatesHandlerMessages.noNotes);
    }

    try {
      return {
        version: latest.version,
        notes: await this.translator.translate(latest.version, latest.notes),
      };
    } catch (error) {
      if (error instanceof TranslationUnavailableError) {
        throw new IpcError(IpcErrorCode.NOT_CONFIGURED, error.message);
      }

      throw new IpcError(IpcErrorCode.PROVIDER_FAILED, TranslatorMessages.failed);
    }
  }
}
