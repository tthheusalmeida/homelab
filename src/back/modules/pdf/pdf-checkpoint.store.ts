import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { PdfChunk } from './pdf-chunker';

export const CHECKPOINT_VERSION = 1;

/** Pastas de progresso mais antigas que isto (sem uso) são apagadas na abertura do app. */
export const CHECKPOINT_MAX_AGE_DAYS = 30;

const MANIFEST_FILE = 'manifest.json';
const PAGE_FILE = 'page.json';
const KEY_FORMAT = /^[a-f0-9]{24}$/;

/** Dados que, com o texto, definem o trabalho: mudou qualquer um, é outro trabalho. */
export interface CheckpointParams {
  providerId: string;
  modelId: string;
  detail: string;
  thinking?: string;
}

export interface CheckpointPart {
  index: number;
  startPage: number;
  endPage: number;
  chars: number;
}

export interface CheckpointManifest {
  version: number;
  key: string;
  fileName: string;
  pageCount: number;
  createdAt: string;
  params: CheckpointParams;
  parts: CheckpointPart[];
}

/** O que a IA preencheu para a página depois de resumir todas as partes. */
export interface CheckpointPage {
  title: string;
  category: string[];
  tags: string[];
}

export interface CheckpointProgress {
  done: number;
  total: number;
}

/**
 * Chave do trabalho: hash do **texto** lido mais o nível de detalhe. O modelo **não** entra: trocar
 * de modelo (por exemplo, porque o limite de uso do primeiro acabou) continua o trabalho de onde parou,
 * e o resumo final junta partes feitas por modelos diferentes. O nível de detalhe entra porque
 * misturar níveis no mesmo resumo deixaria o texto desigual. O mesmo PDF com o mesmo detalhe sempre
 * dá a mesma chave, então um job novo (tentar de novo) acha o que já ficou pronto.
 */
export function checkpointKey(
  chunks: PdfChunk[],
  params: Pick<CheckpointParams, 'detail'>,
): string {
  const hash = createHash('sha256');

  hash.update(JSON.stringify([params.detail]));

  for (const chunk of chunks) {
    hash.update(`\n#${chunk.startPage}-${chunk.endPage}\n`);
    hash.update(chunk.text);
  }

  return hash.digest('hex').slice(0, 24);
}

const partName = (kind: 'part' | 'summary', index: number, extension: string): string =>
  `${kind}-${String(index).padStart(4, '0')}.${extension}`;

/** Grava em arquivo temporário e renomeia: um corte de energia nunca deixa um arquivo pela metade. */
async function writeAtomic(file: string, content: string): Promise<void> {
  const temp = `${file}.tmp`;

  await fs.promises.writeFile(temp, content, 'utf-8');
  await fs.promises.rename(temp, file);
}

/**
 * Progresso do resumo de um PDF em disco, uma pasta por trabalho (`<pasta>/<chave>/`): o manifesto,
 * o texto de cada parte (`part-0000.txt`) e o resumo de cada parte pronta (`summary-0000.md`).
 * O texto é gravado na criação do job (retomar não precisa do PDF) e cada resumo logo que fica pronto.
 */
export class PdfCheckpointStore {
  constructor(private readonly baseDir: string) {}

  /** `true` se a chave tem o formato esperado (impede que um valor de fora saia da pasta de trabalho). */
  static isValidKey(key: string): boolean {
    return KEY_FORMAT.test(key);
  }

  /**
   * Grava o texto das partes e o manifesto. Se a pasta já existe (mesmo trabalho), **mantém** os
   * resumos prontos e só completa o que faltar.
   */
  async create(
    key: string,
    info: { fileName: string; pageCount: number; params: CheckpointParams },
    chunks: PdfChunk[],
  ): Promise<CheckpointManifest> {
    const dir = this.dirOf(key);

    await fs.promises.mkdir(dir, { recursive: true });

    for (const chunk of chunks) {
      await writeAtomic(path.join(dir, partName('part', chunk.index, 'txt')), chunk.text);
    }

    const manifest: CheckpointManifest = {
      version: CHECKPOINT_VERSION,
      key,
      fileName: info.fileName,
      pageCount: info.pageCount,
      createdAt: new Date().toISOString(),
      params: info.params,
      parts: chunks.map((chunk) => ({
        index: chunk.index,
        startPage: chunk.startPage,
        endPage: chunk.endPage,
        chars: chunk.text.length,
      })),
    };

    // o manifesto por último: só existe quando todas as partes já estão gravadas
    await writeAtomic(path.join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));

    return manifest;
  }

  /** O manifesto da chave, ou `null` se a pasta não existe ou o manifesto está ilegível. */
  async load(key: string): Promise<CheckpointManifest | null> {
    try {
      const raw = await fs.promises.readFile(path.join(this.dirOf(key), MANIFEST_FILE), 'utf-8');
      const manifest = JSON.parse(raw) as CheckpointManifest;

      return manifest.version === CHECKPOINT_VERSION && Array.isArray(manifest.parts)
        ? manifest
        : null;
    } catch {
      return null;
    }
  }

  async readPart(key: string, index: number): Promise<string> {
    return fs.promises.readFile(
      path.join(this.dirOf(key), partName('part', index, 'txt')),
      'utf-8',
    );
  }

  /** O resumo pronto da parte, ou `null` se ainda não existe (ou está vazio). */
  async readSummary(key: string, index: number): Promise<string | null> {
    try {
      const text = await fs.promises.readFile(
        path.join(this.dirOf(key), partName('summary', index, 'md')),
        'utf-8',
      );

      return text.trim() ? text : null;
    } catch {
      return null;
    }
  }

  async saveSummary(key: string, index: number, summary: string): Promise<void> {
    await writeAtomic(path.join(this.dirOf(key), partName('summary', index, 'md')), summary);
  }

  /** Dados da página (título, categoria e tags) já preenchidos pela IA, ou `null` se ainda não. */
  async readPage(key: string): Promise<CheckpointPage | null> {
    try {
      const raw = JSON.parse(
        await fs.promises.readFile(path.join(this.dirOf(key), PAGE_FILE), 'utf-8'),
      ) as Partial<CheckpointPage>;

      return typeof raw.title === 'string' && Array.isArray(raw.category) && Array.isArray(raw.tags)
        ? { title: raw.title, category: raw.category, tags: raw.tags }
        : null;
    } catch {
      return null;
    }
  }

  /** Guarda o que a IA preencheu, para uma nova tentativa não gastar a chamada de novo. */
  async savePage(key: string, page: CheckpointPage): Promise<void> {
    await writeAtomic(path.join(this.dirOf(key), PAGE_FILE), JSON.stringify(page, null, 2));
  }

  /** Quantas partes já têm resumo pronto em disco. */
  async progress(key: string): Promise<CheckpointProgress | null> {
    const manifest = await this.load(key);

    if (!manifest) {
      return null;
    }

    let done = 0;

    for (const part of manifest.parts) {
      if ((await this.readSummary(key, part.index)) !== null) {
        done += 1;
      }
    }

    return { done, total: manifest.parts.length };
  }

  /**
   * Igual a `progress`, mas síncrono: a lista de jobs é consultada a cada segundo e só olha arquivos
   * pequenos. `null` se a pasta não existe (o job terminou ou o progresso foi apagado).
   */
  progressSync(key: string): CheckpointProgress | null {
    try {
      const dir = this.dirOf(key);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(dir, MANIFEST_FILE), 'utf-8'),
      ) as CheckpointManifest;
      const done = fs
        .readdirSync(dir)
        .filter((name) => /^summary-\d+\.md$/.test(name))
        .filter((name) => fs.readFileSync(path.join(dir, name), 'utf-8').trim() !== '').length;

      return { done, total: manifest.parts.length };
    } catch {
      return null;
    }
  }

  /** Apaga a pasta do trabalho. */
  async remove(key: string): Promise<void> {
    await fs.promises.rm(this.dirOf(key), { recursive: true, force: true });
  }

  /** Apaga as pastas sem uso há mais de `maxAgeDays` dias. Devolve quantas foram apagadas. */
  async removeStale(
    maxAgeDays: number = CHECKPOINT_MAX_AGE_DAYS,
    now = Date.now(),
  ): Promise<number> {
    let removed = 0;
    let entries: fs.Dirent[];

    try {
      entries = await fs.promises.readdir(this.baseDir, { withFileTypes: true });
    } catch {
      return 0;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !KEY_FORMAT.test(entry.name)) {
        continue;
      }

      const dir = path.join(this.baseDir, entry.name);
      const stat = await fs.promises.stat(dir).catch(() => null);

      if (stat && now - stat.mtimeMs > maxAgeDays * 24 * 60 * 60 * 1000) {
        await fs.promises.rm(dir, { recursive: true, force: true });
        removed += 1;
      }
    }

    return removed;
  }

  private dirOf(key: string): string {
    if (!PdfCheckpointStore.isValidKey(key)) {
      throw new Error('Chave de progresso inválida.');
    }

    return path.join(this.baseDir, key);
  }
}
