import * as fs from 'node:fs';
import * as path from 'node:path';

import type {
  LibraryFolderInfo,
  MoveLibraryRequest,
  MoveLibraryResult,
} from '../shared/contracts/settings';
import { IpcError, IpcErrorCode } from '../shared/errors';
import {
  copyTree,
  isEmptyDir,
  isSameOrInside,
  reasonOf,
  scanTree,
  TreeMessages,
  type ProgressListener,
} from '../storage/tree';

export const LibraryMoverMessages = {
  notAbsolute: 'A pasta da biblioteca deve ser um caminho completo (absoluto).',
  alreadyCurrent: 'Essa já é a pasta da biblioteca.',
  unsafeToDelete: 'A pasta antiga não foi apagada: ela é a raiz de um disco.',
} as const;

/** Parte do Settings que o mover usa: ler a pasta atual e gravar a nova. */
export interface LibrarySettingsPort {
  getLibraryDir(): string;
  setLibraryDir(dir: string): void;
}

/**
 * Troca a pasta da biblioteca sem "perder" os documentos: **copia** (com progresso) a biblioteca atual
 * para uma pasta vazia, confere, grava a nova pasta e só então, se pedido, apaga a antiga. Páginas e
 * livros vão juntos (os livros ficam dentro da pasta da biblioteca). A mesma rotina serve à migração
 * dos dados do formato antigo.
 */
export class LibraryMover {
  constructor(
    private readonly settings: LibrarySettingsPort,
    private readonly onProgress: ProgressListener = () => undefined,
  ) {}

  async inspect(folder: string): Promise<LibraryFolderInfo> {
    this.requireAbsolute(folder);

    const exists = fs.existsSync(folder);
    const scan = await scanTree(folder);

    return {
      path: folder,
      exists,
      empty: await isEmptyDir(folder),
      fileCount: scan.files.length,
    };
  }

  async apply(request: MoveLibraryRequest): Promise<MoveLibraryResult> {
    this.requireAbsolute(request.to);

    const current = this.settings.getLibraryDir();

    if (isSameOrInside(current, request.to) && isSameOrInside(request.to, current)) {
      throw new IpcError(IpcErrorCode.VALIDATION, LibraryMoverMessages.alreadyCurrent);
    }

    if (request.mode === 'use') {
      this.settings.setLibraryDir(request.to);

      return this.result(request.to, { files: 0, bytes: 0 });
    }

    if (isSameOrInside(current, request.to) || isSameOrInside(request.to, current)) {
      throw new IpcError(IpcErrorCode.VALIDATION, TreeMessages.insideEachOther);
    }

    if (!(await isEmptyDir(request.to))) {
      throw new IpcError(IpcErrorCode.VALIDATION, TreeMessages.destinationNotEmpty);
    }

    const copied = await copyTree(current, request.to, this.onProgress);

    this.settings.setLibraryDir(request.to);

    const removal = request.deleteOrigin ? await this.removeOrigin(current) : null;

    return this.result(request.to, copied, removal);
  }

  private requireAbsolute(folder: string): void {
    if (!path.isAbsolute(folder)) {
      throw new IpcError(IpcErrorCode.VALIDATION, LibraryMoverMessages.notAbsolute);
    }
  }

  /** A mudança já deu certo; falhar ao apagar a pasta antiga só gera um aviso. */
  private async removeOrigin(origin: string): Promise<{ removed: boolean; error?: string }> {
    if (path.parse(origin).root === path.resolve(origin)) {
      return { removed: false, error: LibraryMoverMessages.unsafeToDelete };
    }

    try {
      await fs.promises.rm(origin, { recursive: true, force: true });

      return { removed: true };
    } catch (error) {
      return { removed: false, error: reasonOf(error) };
    }
  }

  private result(
    libraryDir: string,
    copied: { files: number; bytes: number },
    removal: { removed: boolean; error?: string } | null = null,
  ): MoveLibraryResult {
    return {
      libraryDir,
      filesCopied: copied.files,
      bytesCopied: copied.bytes,
      originRemoved: removal?.removed ?? false,
      ...(removal?.error ? { originRemoveError: removal.error } : {}),
      restartRequired: true,
    };
  }
}
