import * as fs from 'node:fs';
import * as path from 'node:path';

import type { TranscriptSegment } from '../../ai/whisper/whisper.service';

/** O que cada etapa já deixou pronto para o job (e que a retomada reaproveita). */
export interface JobArtifacts {
  videoPath?: string;
  audioPath?: string;
  /** Transcrição em texto (resumo de vídeo). */
  transcript?: string;
  /** Transcrição com o tempo de cada trecho (transcrição de vídeo). */
  segments?: TranscriptSegment[];
  /** Resumo gerado pela IA, ainda não salvo na entrada. */
  summary?: string;
}

/** Onde o job guarda o resultado das etapas concluídas. */
export abstract class JobArtifactStore {
  abstract load(jobId: string): Promise<JobArtifacts>;
  abstract save(jobId: string, patch: Partial<JobArtifacts>): Promise<void>;
  abstract clear(jobId: string): Promise<void>;
}

/** Sem pasta configurada (testes): guarda só na memória. */
export class MemoryJobArtifactStore extends JobArtifactStore {
  private readonly data = new Map<string, JobArtifacts>();

  load(jobId: string): Promise<JobArtifacts> {
    return Promise.resolve({ ...this.data.get(jobId) });
  }

  save(jobId: string, patch: Partial<JobArtifacts>): Promise<void> {
    this.data.set(jobId, { ...this.data.get(jobId), ...patch });

    return Promise.resolve();
  }

  clear(jobId: string): Promise<void> {
    this.data.delete(jobId);

    return Promise.resolve();
  }
}

/**
 * Um arquivo `<jobId>.state.json` na pasta temporária do áudio. O id do job no nome faz a limpeza
 * de temporários respeitar o job ativo. Gravação atômica: arquivo temporário e renomeação, então um
 * corte de energia nunca deixa o estado pela metade.
 */
export class FileJobArtifactStore extends JobArtifactStore {
  constructor(private readonly dir: string) {
    super();
  }

  private file(jobId: string): string {
    return path.join(this.dir, `${jobId}.state.json`);
  }

  async load(jobId: string): Promise<JobArtifacts> {
    try {
      const parsed: unknown = JSON.parse(await fs.promises.readFile(this.file(jobId), 'utf8'));

      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  async save(jobId: string, patch: Partial<JobArtifacts>): Promise<void> {
    const merged = { ...(await this.load(jobId)), ...patch };
    const target = this.file(jobId);
    const temp = `${target}.tmp`;

    await fs.promises.mkdir(this.dir, { recursive: true });
    await fs.promises.writeFile(temp, JSON.stringify(merged), 'utf8');
    await fs.promises.rename(temp, target);
  }

  async clear(jobId: string): Promise<void> {
    await fs.promises.rm(this.file(jobId), { force: true });
  }
}
