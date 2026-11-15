import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';

import * as yauzl from 'yauzl';
import * as yazl from 'yazl';

import { IpcError, IpcErrorCode } from '../shared/errors';
import { isSameOrInside, reasonOf } from '../storage/tree';

export const ZipMessages = {
  invalidZip: 'Este arquivo não é um backup do HomeLab válido.',
  unsafePath: (name: string) => `O backup contém um caminho inválido: ${name}`,
  tooBig: (name: string) => `O arquivo ${name} do backup é grande demais para ser lido.`,
  writeFailed: (reason: string) => `Não foi possível criar o backup: ${reason}`,
} as const;

/** Maior arquivo de texto (manifesto, coleções) lido inteiro na memória. */
const MAX_TEXT_BYTES = 200 * 1024 * 1024;

export type ZipSource = { file: string } | { buffer: Buffer };

export interface ZipEntryToWrite {
  /** Caminho dentro do zip, com `/`. */
  name: string;
  source: ZipSource;
}

export interface WriteZipOptions {
  /** Chamado a cada arquivo já incluído no zip (índice a partir de 1). */
  onEntry?: (name: string, done: number, total: number) => void;
  signal?: AbortSignal;
}

export function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/** Fecha o stream e só devolve quando ele de fato fechou (inclusive se ainda estava abrindo o arquivo). */
function closeStream(stream: fs.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (stream.closed) {
      resolve();

      return;
    }

    stream.once('close', () => resolve());
    stream.destroy();
  });
}

export const isAbortError = (error: unknown): error is DOMException =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Cria o zip por **streaming**, um arquivo de cada vez (não carrega a biblioteca na memória e dá
 * progresso por arquivo). Escreve em `<destino>.partial` e só renomeia no fim: cancelar ou falhar
 * nunca deixa um zip pela metade (o parcial é apagado). Cancelar lança `AbortError`.
 */
export async function writeZip(
  destination: string,
  entries: ZipEntryToWrite[],
  options: WriteZipOptions = {},
): Promise<{ bytes: number }> {
  const { signal, onEntry } = options;
  const partial = `${destination}.partial`;

  // a pasta precisa existir antes de abrir o arquivo parcial
  await fs.promises.mkdir(path.dirname(destination), { recursive: true }).catch((error) => {
    throw new IpcError(IpcErrorCode.PERSIST_FAILED, ZipMessages.writeFailed(reasonOf(error)));
  });

  const zip = new yazl.ZipFile();
  const output = fs.createWriteStream(partial);
  let current: fs.ReadStream | null = null;
  let aborted = false;

  const finished = new Promise<void>((resolve, reject) => {
    output.once('close', resolve);
    output.once('error', reject);
    zip.outputStream.once('error', reject);
  });
  // se o laço falhar antes de aguardarmos `finished`, não deixa a rejeição sem tratador
  finished.catch(() => undefined);

  const onAbort = () => {
    aborted = true;
    current?.destroy();
    zip.outputStream.unpipe(output);
    output.destroy();
  };

  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    zip.outputStream.pipe(output);

    let done = 0;

    for (const entry of entries) {
      if (signal?.aborted) {
        throw abortError();
      }

      if ('buffer' in entry.source) {
        zip.addBuffer(entry.source.buffer, entry.name);
      } else {
        const { mtime } = await fs.promises.stat(entry.source.file);
        const stream = fs.createReadStream(entry.source.file);

        current = stream;
        zip.addReadStream(stream, entry.name, { mtime });

        // o zip só termina de ler o arquivo quando o consumo anda: isto é o "um de cada vez"
        await new Promise<void>((resolve, reject) => {
          stream.once('end', resolve);
          stream.once('error', reject);
          stream.once('close', () => (aborted ? reject(abortError()) : resolve()));
        });
        current = null;
      }

      done += 1;
      onEntry?.(entry.name, done, entries.length);
    }

    if (signal?.aborted) {
      throw abortError();
    }

    zip.end();
    await finished;

    if (aborted) {
      throw abortError();
    }

    await fs.promises.rename(partial, destination);

    return { bytes: (await fs.promises.stat(destination)).size };
  } catch (error) {
    current?.destroy();
    // o arquivo parcial pode ainda estar sendo aberto: espera fechar para apagá-lo de verdade
    await closeStream(output);
    await fs.promises.rm(partial, { force: true }).catch(() => undefined);

    if (isAbortError(error)) {
      throw error;
    }

    throw new IpcError(IpcErrorCode.PERSIST_FAILED, ZipMessages.writeFailed(reasonOf(error)));
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface ZipEntryInfo {
  name: string;
  size: number;
  isDirectory: boolean;
}

function openZip(file: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(new IpcError(IpcErrorCode.VALIDATION, ZipMessages.invalidZip));

        return;
      }

      resolve(zipFile);
    });
  });
}

/** Percorre as entradas uma a uma; devolver `false` do visitante interrompe a leitura. */
async function walkZip(
  file: string,
  visit: (entry: yauzl.Entry, zipFile: yauzl.ZipFile) => Promise<boolean | void>,
): Promise<void> {
  const zipFile = await openZip(file);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      zipFile.close();

      if (error) {
        reject(
          error instanceof IpcError || isAbortError(error)
            ? error
            : new IpcError(IpcErrorCode.VALIDATION, ZipMessages.invalidZip),
        );
      } else {
        resolve();
      }
    };

    zipFile.on('error', finish);
    zipFile.on('end', () => finish());
    zipFile.on('entry', (entry: yauzl.Entry) => {
      visit(entry, zipFile).then(
        (keepGoing) => (keepGoing === false ? finish() : zipFile.readEntry()),
        finish,
      );
    });
    zipFile.readEntry();
  });
}

/** Lista o conteúdo do zip lendo só o diretório central (não extrai nada). */
export async function listZip(file: string): Promise<ZipEntryInfo[]> {
  const entries: ZipEntryInfo[] = [];

  await walkZip(file, (entry) => {
    entries.push({
      name: entry.fileName,
      size: entry.uncompressedSize,
      isDirectory: entry.fileName.endsWith('/'),
    });

    return Promise.resolve();
  });

  return entries;
}

function openEntry(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error('entrada ilegível'));

        return;
      }

      resolve(stream);
    });
  });
}

/** Lê um arquivo de texto do zip; `null` se ele não existe. */
export async function readZipText(file: string, entryName: string): Promise<string | null> {
  let text: string | null = null;

  await walkZip(file, async (entry, zipFile) => {
    if (entry.fileName !== entryName) {
      return true;
    }

    if (entry.uncompressedSize > MAX_TEXT_BYTES) {
      throw new IpcError(IpcErrorCode.VALIDATION, ZipMessages.tooBig(entryName));
    }

    const chunks: Buffer[] = [];

    for await (const chunk of await openEntry(zipFile, entry)) {
      chunks.push(chunk as Buffer);
    }

    text = Buffer.concat(chunks).toString('utf8');

    return false;
  });

  return text;
}

/**
 * Caminho de destino de uma entrada do zip, **dentro** da pasta de destino. Recusa qualquer nome que
 * possa escapar dela (zip-slip): absoluto, com unidade de disco, `..`, barra invertida.
 */
export function safeEntryTarget(destDir: string, name: string): string {
  const segments = name.split('/').filter((segment) => segment !== '');
  const unsafe =
    name === '' ||
    name.includes('\\') ||
    name.includes('\0') ||
    name.startsWith('/') ||
    /^[A-Za-z]:/.test(name) ||
    segments.some((segment) => segment === '..' || segment === '.');

  const target = path.join(destDir, ...segments);

  if (unsafe || segments.length === 0 || !isSameOrInside(destDir, target)) {
    throw new IpcError(IpcErrorCode.VALIDATION, ZipMessages.unsafePath(name));
  }

  return target;
}

export interface ExtractZipOptions {
  /** Quais entradas extrair (por padrão, todas). */
  accept?: (name: string) => boolean;
  onEntry?: (name: string, done: number) => void;
  signal?: AbortSignal;
}

/** Extrai o zip para uma pasta, validando o caminho de cada entrada. Devolve quantos arquivos saíram. */
export async function extractZip(
  file: string,
  destDir: string,
  options: ExtractZipOptions = {},
): Promise<{ files: number }> {
  let files = 0;

  await fs.promises.mkdir(destDir, { recursive: true });

  await walkZip(file, async (entry, zipFile) => {
    if (options.signal?.aborted) {
      throw abortError();
    }

    const name = entry.fileName;
    const target = safeEntryTarget(destDir, name);

    if (options.accept && !options.accept(name)) {
      return true;
    }

    if (name.endsWith('/')) {
      await fs.promises.mkdir(target, { recursive: true });

      return true;
    }

    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await pipeline(await openEntry(zipFile, entry), fs.createWriteStream(target));

    files += 1;
    options.onEntry?.(name, files);

    return true;
  });

  return { files };
}
