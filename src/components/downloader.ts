import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';

export const DownloadMessages = {
  http: (status: number) => `O servidor respondeu ${status} ao baixar o arquivo.`,
  noBody: 'O servidor não enviou o arquivo.',
  checksum: 'O arquivo baixado está corrompido (checksum diferente do esperado). Tente de novo.',
  incomplete: 'O download terminou antes do fim do arquivo. Tente de novo.',
} as const;

export interface DownloadRequest {
  url: string;
  /** Destino final; o download vai para `<destino>.part` e só vira o destino depois de conferido. */
  destination: string;
  sha256: string;
  /** Tamanho esperado em bytes, usado quando o servidor não informa `content-length`. */
  expectedBytes: number;
  signal?: AbortSignal;
  onProgress?: (receivedBytes: number, totalBytes: number) => void;
  onVerifying?: () => void;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

const PROGRESS_INTERVAL_MS = 150;

/**
 * Baixa um arquivo grande em fluxo (sem carregar na memória), calcula o SHA-256 enquanto grava e
 * só entrega o arquivo se o checksum bater. Em qualquer falha ou cancelamento o `.part` é apagado.
 */
export async function downloadVerified(
  fetchFn: FetchLike,
  request: DownloadRequest,
): Promise<void> {
  const part = `${request.destination}.part`;

  await fs.promises.mkdir(path.dirname(request.destination), { recursive: true });

  try {
    const response = await fetchFn(request.url, { signal: request.signal });

    if (!response.ok) {
      throw new Error(DownloadMessages.http(response.status));
    }

    if (!response.body) {
      throw new Error(DownloadMessages.noBody);
    }

    const header = Number(response.headers.get('content-length'));
    const total = Number.isFinite(header) && header > 0 ? header : request.expectedBytes;
    const hash = createHash('sha256');
    const out = fs.createWriteStream(part);
    let received = 0;
    let lastReport = 0;

    const source = Readable.fromWeb(response.body);

    source.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      received += chunk.length;

      const now = Date.now();

      if (now - lastReport >= PROGRESS_INTERVAL_MS) {
        lastReport = now;
        request.onProgress?.(received, total);
      }
    });

    await new Promise<void>((resolve, reject) => {
      source.on('error', reject);
      out.on('error', reject);
      out.on('finish', resolve);
      source.pipe(out);
    });

    request.onProgress?.(received, total);

    if (received < total && header > 0) {
      throw new Error(DownloadMessages.incomplete);
    }

    request.onVerifying?.();

    if (hash.digest('hex') !== request.sha256.toLowerCase()) {
      throw new Error(DownloadMessages.checksum);
    }

    await fs.promises.rename(part, request.destination);
  } catch (error) {
    await fs.promises.rm(part, { force: true });
    throw error;
  }
}

/** SHA-256 de um arquivo (leitura em fluxo). */
export async function sha256OfFile(file: string): Promise<string> {
  const hash = createHash('sha256');

  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
}
