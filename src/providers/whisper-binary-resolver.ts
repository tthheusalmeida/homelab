import * as path from 'node:path';

import {
  findComponent,
  platformTarget,
  WHISPER_RUNTIME_ID,
} from '../components/component-manifest';
import { IpcError, IpcErrorCode } from '../shared/errors';

export const WhisperMessages = {
  unsupported: 'A transcrição ainda não está disponível neste sistema operacional.',
  executableMissing: () =>
    'A transcrição não está instalada. Abra Configurações > Componentes, instale-a e tente de novo.',
  modelMissing: () =>
    'Nenhum modelo de transcrição instalado. Abra Configurações > Componentes, instale um e tente de novo.',
} as const;

export interface WhisperLocation {
  directory: string;
  executable: string;
  model: string;
}

/** Modelo: nome do arquivo (dentro da pasta do Whisper) ou caminho completo em qualquer lugar. */
export function whisperModelPath(directory: string, model: string): string {
  return path.isAbsolute(model) ? model : path.join(directory, model);
}

export interface WhisperResolverDeps {
  platform: NodeJS.Platform;
  arch: string;
  exists: (file: string) => boolean;
}

/**
 * Escolhe o executável e o modelo do Whisper e explica, com o código certo, por que não dá:
 * - o binário existe na pasta configurada: usa (mesmo em plataforma sem binário embutido);
 * - não existe e o catálogo não tem a transcrição para o sistema: `UNSUPPORTED_PLATFORM`;
 * - não existe numa plataforma suportada, ou falta o modelo: `NOT_CONFIGURED`.
 */
export class WhisperBinaryResolver {
  constructor(private readonly deps: WhisperResolverDeps) {}

  resolveExecutable({ directory, executable }: WhisperLocation): string {
    const file = path.join(directory, executable);

    if (this.deps.exists(file)) {
      return file;
    }

    if (!this.isSupported()) {
      throw new IpcError(IpcErrorCode.UNSUPPORTED_PLATFORM, WhisperMessages.unsupported);
    }

    throw new IpcError(IpcErrorCode.NOT_CONFIGURED, WhisperMessages.executableMissing());
  }

  resolveModel({ directory, model }: WhisperLocation): string {
    const file = whisperModelPath(directory, model);

    if (!this.deps.exists(file)) {
      throw new IpcError(IpcErrorCode.NOT_CONFIGURED, WhisperMessages.modelMissing());
    }

    return file;
  }

  private isSupported(): boolean {
    // Há transcrição embutida ou baixável quando o catálogo tem o item para este sistema.
    return (
      findComponent(WHISPER_RUNTIME_ID, platformTarget(this.deps.platform, this.deps.arch)) !==
      undefined
    );
  }
}
