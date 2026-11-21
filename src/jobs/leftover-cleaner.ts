import * as fs from 'node:fs';
import * as path from 'node:path';

import type { JobCleanResult, JobLeftovers } from '../shared/contracts/jobs';

/** Job na fila ou rodando: o que ele usa não pode ser apagado. */
export interface ActiveJobInfo {
  id: string;
  /** Dados de criação do job (resumo de PDF guarda `checkpointKey`). */
  request?: unknown;
}

export interface LeftoverDirs {
  /** Pasta do progresso dos resumos de PDF (uma pasta por trabalho). */
  pdfWorkDir?: string;
  /** Pastas dos vídeos e áudios temporários (arquivos com o id do job no nome). */
  mediaDirs: string[];
}

export interface LeftoverCleanerDeps {
  activeJobs: () => ActiveJobInfo[];
  /** Lido a cada uso (as pastas vêm da configuração do back). */
  dirs: () => LeftoverDirs;
}

interface Entry {
  path: string;
  files: number;
  bytes: number;
}

const PDF_KEY = /^[a-f0-9]{24}$/;

async function measure(target: string): Promise<{ files: number; bytes: number }> {
  const stat = await fs.promises.lstat(target);

  if (!stat.isDirectory()) {
    return { files: 1, bytes: stat.size };
  }

  let files = 0;
  let bytes = 0;

  for (const name of await fs.promises.readdir(target)) {
    const inner = await measure(path.join(target, name)).catch(() => ({ files: 0, bytes: 0 }));

    files += inner.files;
    bytes += inner.bytes;
  }

  return { files, bytes };
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dir);
  } catch {
    return [];
  }
}

/**
 * Arquivos que ficam no disco quando um processo não termina (falhou, foi cancelado ou o app fechou):
 * o progresso dos resumos de PDF e os vídeos e áudios temporários. `scan` mede, `clean` apaga.
 * **Nunca toca no que um job na fila ou rodando usa**, nem nos documentos gerados (inbox e biblioteca).
 */
export class LeftoverCleaner {
  constructor(private readonly deps: LeftoverCleanerDeps) {}

  async scan(): Promise<JobLeftovers> {
    const entries = await this.collect();

    return {
      files: entries.reduce((total, entry) => total + entry.files, 0),
      bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    };
  }

  async clean(): Promise<JobCleanResult> {
    const result: JobCleanResult = { files: 0, bytes: 0, failed: 0 };

    for (const entry of await this.collect()) {
      try {
        await fs.promises.rm(entry.path, { recursive: true, force: true });
        result.files += entry.files;
        result.bytes += entry.bytes;
      } catch {
        // arquivo em uso ou sem permissão: segue com os outros e avisa quantos ficaram
        result.failed += 1;
      }
    }

    return result;
  }

  private async collect(): Promise<Entry[]> {
    const active = this.deps.activeJobs();
    const activeIds = active.map((job) => job.id);
    const activeKeys = new Set(
      active
        .map((job) => (job.request as { checkpointKey?: unknown } | undefined)?.checkpointKey)
        .filter((key): key is string => typeof key === 'string'),
    );
    const { pdfWorkDir, mediaDirs } = this.deps.dirs();
    const targets: string[] = [];

    if (pdfWorkDir) {
      for (const name of await listDir(pdfWorkDir)) {
        if (PDF_KEY.test(name) && !activeKeys.has(name)) {
          targets.push(path.join(pdfWorkDir, name));
        }
      }
    }

    for (const dir of mediaDirs) {
      for (const name of await listDir(dir)) {
        if (!activeIds.some((id) => name.includes(id))) {
          targets.push(path.join(dir, name));
        }
      }
    }

    const entries: Entry[] = [];

    for (const target of targets) {
      const size = await measure(target).catch(() => null);

      if (size) {
        entries.push({ path: target, ...size });
      }
    }

    return entries;
  }
}
