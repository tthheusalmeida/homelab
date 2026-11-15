import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ProgressEventPayload } from '../shared/contracts/events';
import { IpcError, IpcErrorCode } from '../shared/errors';

export const TreeMessages = {
  copyFailed: (file: string, reason: string) => `Não foi possível copiar "${file}": ${reason}`,
  verifyFailed: (file: string) =>
    `A cópia de "${file}" não confere com o original. Nada foi alterado.`,
  destinationNotEmpty: 'A pasta de destino precisa estar vazia.',
  insideEachOther: 'A pasta de destino não pode ficar dentro da pasta atual (nem o contrário).',
} as const;

export interface TreeFile {
  /** Caminho relativo à raiz, com `/` (igual em qualquer sistema). */
  relativePath: string;
  size: number;
}

export interface TreeScan {
  files: TreeFile[];
  /** Subpastas (relativas), das mais rasas para as mais fundas; inclui as vazias. */
  dirs: string[];
  totalBytes: number;
}

export type ProgressListener = (progress: ProgressEventPayload) => void;

const normalizeForCompare = (value: string): string => {
  const resolved = path.resolve(value);

  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

/** `true` se `candidate` é a mesma pasta que `parent` ou está dentro dela. */
export function isSameOrInside(parent: string, candidate: string): boolean {
  const relative = path.relative(normalizeForCompare(parent), normalizeForCompare(candidate));

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** Pasta inexistente conta como vazia. */
export async function isEmptyDir(dir: string): Promise<boolean> {
  try {
    return (await fs.promises.readdir(dir)).length === 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return true;
    }

    throw error;
  }
}

/**
 * Lista arquivos e pastas de uma árvore. Pasta inexistente devolve resultado vazio. Links simbólicos
 * são ignorados (só arquivos e pastas de verdade entram).
 */
export async function scanTree(root: string): Promise<TreeScan> {
  const scan: TreeScan = { files: [], dirs: [], totalBytes: 0 };

  async function walk(relative: string): Promise<void> {
    const absolute = relative ? path.join(root, relative) : root;
    let entries: fs.Dirent[];

    try {
      entries = await fs.promises.readdir(absolute, { withFileTypes: true });
    } catch (error) {
      if (!relative && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }

      throw error;
    }

    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        scan.dirs.push(child);
        await walk(child);
      } else if (entry.isFile()) {
        const { size } = await fs.promises.stat(path.join(root, child));

        scan.files.push({ relativePath: child, size });
        scan.totalBytes += size;
      }
    }
  }

  await walk('');

  return scan;
}

/**
 * Copia uma árvore de pastas conferindo o resultado (existência e tamanho de cada arquivo). Não
 * sobrescreve nada: se algum arquivo já existe no destino, falha. Em qualquer falha, **desfaz o que
 * criou** e lança `PERSIST_FAILED`; a origem nunca é alterada.
 */
export async function copyTree(
  from: string,
  to: string,
  onProgress?: ProgressListener,
): Promise<{ files: number; bytes: number }> {
  onProgress?.({ phase: 'preparing', processed: 0, total: 0 });

  const scan = await scanTree(from);
  const total = scan.files.length;
  const createdFiles: string[] = [];
  const createdDirs: string[] = [];

  const ensureDir = async (dir: string): Promise<void> => {
    const missing: string[] = [];
    let current = dir;

    while (!fs.existsSync(current)) {
      missing.push(current);
      const parent = path.dirname(current);

      if (parent === current) {
        break;
      }

      current = parent;
    }

    await fs.promises.mkdir(dir, { recursive: true });
    createdDirs.push(...missing.reverse());
  };

  try {
    await ensureDir(to);

    for (const dir of scan.dirs) {
      await ensureDir(path.join(to, dir));
    }

    let processed = 0;

    for (const file of scan.files) {
      const target = path.join(to, file.relativePath);

      try {
        await fs.promises.copyFile(
          path.join(from, file.relativePath),
          target,
          fs.constants.COPYFILE_EXCL,
        );
      } catch (error) {
        throw new IpcError(
          IpcErrorCode.PERSIST_FAILED,
          TreeMessages.copyFailed(file.relativePath, reasonOf(error)),
        );
      }

      createdFiles.push(target);
      processed += 1;
      onProgress?.({ phase: 'running', processed, total, currentFile: file.relativePath });
    }

    onProgress?.({ phase: 'verifying', processed: total, total });

    for (const file of scan.files) {
      const { size } = await fs.promises.stat(path.join(to, file.relativePath));

      if (size !== file.size) {
        throw new IpcError(
          IpcErrorCode.PERSIST_FAILED,
          TreeMessages.verifyFailed(file.relativePath),
        );
      }
    }
  } catch (error) {
    await rollback(createdFiles, createdDirs);

    throw error instanceof IpcError
      ? error
      : new IpcError(IpcErrorCode.PERSIST_FAILED, reasonOf(error));
  }

  onProgress?.({ phase: 'done', processed: total, total });

  return { files: total, bytes: scan.totalBytes };
}

async function rollback(files: string[], dirs: string[]): Promise<void> {
  for (const file of files) {
    await fs.promises.rm(file, { force: true }).catch(() => undefined);
  }

  for (const dir of [...dirs].reverse()) {
    await fs.promises.rmdir(dir).catch(() => undefined);
  }
}

export function reasonOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'erro desconhecido';
}

/**
 * Limita a frequência de um listener de progresso (uma biblioteca grande gera milhares de eventos).
 * O primeiro evento, a troca de fase e o último passam sempre.
 */
export function throttleProgress(listener: ProgressListener, everyMs = 80): ProgressListener {
  let lastAt = 0;
  let lastPhase: string | null = null;

  return (progress) => {
    const now = Date.now();
    const isEdge =
      progress.phase !== lastPhase ||
      progress.phase === 'done' ||
      progress.processed >= progress.total;

    if (isEdge || now - lastAt >= everyMs) {
      lastAt = now;
      lastPhase = progress.phase;
      listener(progress);
    }
  };
}
