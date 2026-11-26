import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const KEY_FORMAT = /^[a-f0-9]{24}$/;

/** `sample`: página lida só para descobrir o idioma. `page`: página lida com os idiomas definitivos. */
export type OcrCacheKind = 'sample' | 'page';

export interface CachedOcrPage {
  /** Assinatura do motor (idiomas e qualidade) que leu a página; outra assinatura invalida o cache. */
  signature: string;
  lines: string[];
  /** Confiança média (0 a 100) das palavras mantidas. */
  confidence: number;
}

const fileName = (kind: OcrCacheKind, page: number): string =>
  `${kind}-${String(page).padStart(4, '0')}.json`;

/** Chave do arquivo: hash do **conteúdo** do PDF. O mesmo arquivo, em qualquer pasta, acha o cache. */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex').slice(0, 24)));
  });
}

/**
 * Texto reconhecido de cada página, em disco (`<pasta>/<chave>/page-0007.json`). O reconhecimento é
 * a parte demorada da leitura: gravar página a página deixa retomar de onde parou depois de uma
 * queda e evita refazer o trabalho ao escolher o mesmo PDF de novo, sem guardar nada na memória.
 * Mora na pasta de progresso dos resumos de PDF (`temp/pdf`), então a limpeza dos 30 dias e o botão
 * "Limpar arquivos temporários" também cobrem estas pastas (a chave tem o mesmo formato).
 */
export class OcrPageCache {
  constructor(private readonly baseDir: string) {}

  async read(key: string, kind: OcrCacheKind, page: number): Promise<CachedOcrPage | null> {
    try {
      const raw = JSON.parse(
        await fs.promises.readFile(path.join(this.dirOf(key), fileName(kind, page)), 'utf-8'),
      ) as Partial<CachedOcrPage>;

      return typeof raw.signature === 'string' &&
        Array.isArray(raw.lines) &&
        typeof raw.confidence === 'number'
        ? { signature: raw.signature, lines: raw.lines, confidence: raw.confidence }
        : null;
    } catch {
      return null;
    }
  }

  async write(key: string, kind: OcrCacheKind, page: number, value: CachedOcrPage): Promise<void> {
    const dir = this.dirOf(key);
    const file = path.join(dir, fileName(kind, page));

    await fs.promises.mkdir(dir, { recursive: true });
    // temporário + renomear: uma queda de energia nunca deixa o arquivo pela metade
    await fs.promises.writeFile(`${file}.tmp`, JSON.stringify(value), 'utf-8');
    await fs.promises.rename(`${file}.tmp`, file);
  }

  async remove(key: string): Promise<void> {
    await fs.promises.rm(this.dirOf(key), { recursive: true, force: true });
  }

  private dirOf(key: string): string {
    if (!KEY_FORMAT.test(key)) {
      throw new Error('Chave de leitura inválida.');
    }

    return path.join(this.baseDir, key);
  }
}
