import { createHash } from 'node:crypto';
import * as path from 'node:path';

/** Onde fica o registro dos arquivos do front que o desktop substitui. */
export const OVERRIDES_LOCK_FILE = path.join('renderer', 'overrides', 'overrides.lock.json');

export const OverrideMessages = {
  changed: (file: string, override: string) =>
    `O arquivo do front "${file}" mudou desde a cópia em "${override}". ` +
    'Reconcile as mudanças na cópia do desktop e rode "npm run overrides:update".',
  missing: (file: string) => `O arquivo do front "${file}" não foi encontrado.`,
} as const;

export interface OverrideEntry {
  /** Caminho da cópia, relativo à raiz do desktop. */
  override: string;
  /** Hash do arquivo do front no momento em que a cópia foi feita. */
  sha256: string;
}

/** Chave: caminho do arquivo no front, relativo à raiz do front. */
export type OverridesLock = Record<string, OverrideEntry>;

export type OverrideStatus = 'ok' | 'changed' | 'missing';

export interface OverrideCheck {
  file: string;
  override: string;
  status: OverrideStatus;
}

/** Hash do conteúdo ignorando a diferença entre CRLF e LF (o front tem arquivos CRLF). */
export function hashContent(content: string): string {
  return createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
}

type ReadFile = (file: string) => string | null;

/** Compara o front atual com os hashes registrados. */
export function checkOverrides(
  lock: OverridesLock,
  frontDir: string,
  readFile: ReadFile,
): OverrideCheck[] {
  return Object.entries(lock).map(([file, entry]) => {
    const content = readFile(path.join(frontDir, file));
    const status: OverrideStatus =
      content === null ? 'missing' : hashContent(content) === entry.sha256 ? 'ok' : 'changed';

    return { file, override: entry.override, status };
  });
}

/** Mensagens de erro para tudo que não está `ok`. */
export function describeProblems(checks: OverrideCheck[]): string[] {
  return checks
    .filter((check) => check.status !== 'ok')
    .map((check) =>
      check.status === 'missing'
        ? OverrideMessages.missing(check.file)
        : OverrideMessages.changed(check.file, check.override),
    );
}

/** Recalcula os hashes (usado depois de reconciliar a cópia com o front). */
export function refreshLock(
  lock: OverridesLock,
  frontDir: string,
  readFile: ReadFile,
): OverridesLock {
  return Object.fromEntries(
    Object.entries(lock).map(([file, entry]) => {
      const content = readFile(path.join(frontDir, file));

      if (content === null) {
        throw new Error(OverrideMessages.missing(file));
      }

      return [file, { ...entry, sha256: hashContent(content) }];
    }),
  );
}
