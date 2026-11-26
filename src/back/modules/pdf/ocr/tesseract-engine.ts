import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { OcrEngine, OcrLanguagePacks, OcrLines, OcrSession } from './ocr-engine.port';
import { ocrModelFile, type OcrLanguageId } from './ocr-languages';

export const OcrEngineMessages = {
  languageMissing: (language: string) =>
    `O reconhecimento de texto em imagens não está instalado para o idioma "${language}".`,
} as const;

interface TesseractWord {
  text: string;
  confidence: number;
}

interface TesseractPage {
  blocks: Array<{
    paragraphs: Array<{ lines: Array<{ words: TesseractWord[] }> }>;
  }> | null;
}

interface TesseractWorker {
  recognize(
    image: Uint8Array,
    options: Record<string, unknown>,
    output: Record<string, boolean>,
  ): Promise<{ data: TesseractPage }>;
  terminate(): Promise<unknown>;
}

export interface TesseractModule {
  createWorker(
    languages: string,
    engineMode: number,
    options: Record<string, unknown>,
  ): Promise<TesseractWorker>;
}

/** Onde o motor (script do worker e núcleo WASM) está, já apontando para fora do `.asar`. */
export interface TesseractPaths {
  workerPath: string;
  corePath: string;
}

/** `app.asar` → `app.asar.unpacked`: um worker não roda de dentro do pacote do app. */
export function outOfAsar(file: string): string {
  return file.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
}

export function resolveTesseractPaths(): TesseractPaths {
  return {
    workerPath: outOfAsar(require.resolve('tesseract.js/src/worker-script/node/index.js')),
    corePath: outOfAsar(path.dirname(require.resolve('tesseract.js-core/package.json'))),
  };
}

/** Só o motor LSTM (o mais preciso), sem o modo antigo. */
const LSTM_ONLY = 1;

/** Liga o arquivo de dados na pasta do motor; copia se o sistema não deixar ligar. */
async function place(source: string, target: string): Promise<void> {
  try {
    await fs.promises.link(source, target);
  } catch {
    await fs.promises.copyFile(source, target);
  }
}

/**
 * Motor de reconhecimento de texto (Tesseract em WASM, num worker próprio: o app não trava). Os dados
 * de cada idioma vêm do catálogo de componentes; cada sessão monta uma pasta temporária só com os
 * idiomas pedidos (cada um na qualidade instalada), então o motor nunca baixa nada sozinho.
 */
export class TesseractOcrEngine implements OcrEngine {
  constructor(
    private readonly packs: Pick<OcrLanguagePacks, 'locate'>,
    // carregado só quando uma página escaneada é lida (o motor não pesa na abertura do app)
    private readonly load: () => Promise<TesseractModule> = () => import('tesseract.js'),
    private readonly paths: () => TesseractPaths = resolveTesseractPaths,
  ) {}

  async open(languages: readonly OcrLanguageId[]): Promise<OcrSession> {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'homelab-ocr-'));
    const signature: string[] = [];

    try {
      for (const language of languages) {
        const located = this.packs.locate(language);

        if (!located) {
          throw new Error(OcrEngineMessages.languageMissing(language));
        }

        await place(located.file, path.join(dir, ocrModelFile(language)));
        signature.push(`${language}:${located.quality}`);
      }

      const tesseract = await this.load();
      const worker = await tesseract.createWorker(languages.join('+'), LSTM_ONLY, {
        ...this.paths(),
        langPath: dir,
        gzip: false,
        cacheMethod: 'none',
      });

      return {
        signature: signature.join('+'),
        recognize: async (image) =>
          toLines((await worker.recognize(image, {}, { blocks: true })).data),
        close: async () => {
          await worker.terminate().catch(() => undefined);
          await fs.promises.rm(dir, { recursive: true, force: true });
        },
      };
    } catch (error) {
      await fs.promises.rm(dir, { recursive: true, force: true });

      throw error;
    }
  }
}

function toLines(page: TesseractPage): OcrLines {
  const lines: OcrLines = [];

  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        lines.push(line.words.map((word) => ({ text: word.text, confidence: word.confidence })));
      }
    }
  }

  return lines;
}
