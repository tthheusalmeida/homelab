import type { PdfReadStage } from '../../../../shared/contracts/pdf';
import { PdfMessages, PdfProblem, PdfReadError } from '../pdf-read.error';
import type { PdfDocumentHandle } from '../pdf-opener.port';
import { detectLanguages } from './language-detector';
import type { OcrEngine, OcrLanguagePacks, OcrSession } from './ocr-engine.port';
import { OCR_BOOTSTRAP_LANGUAGE, type OcrLanguageId } from './ocr-languages';
import type { OcrCacheKind, OcrPageCache } from './ocr-page-cache';
import { buildPageText } from './ocr-text';

/** Lado maior da imagem enviada ao motor, em pixels: nítido o bastante e sem pesar na memória. */
export const OCR_LONG_EDGE_PX = 2000;

/** Quantas páginas (espalhadas pelo documento) são lidas só para descobrir o idioma. */
export const LANGUAGE_SAMPLE_PAGES = 4;

/** No máximo tantos idiomas por documento (cada um a mais deixa a leitura mais lenta e menos precisa). */
export const MAX_DOCUMENT_LANGUAGES = 3;

/** Idiomas usados quando o texto não permite descobrir o idioma. */
export const FALLBACK_LANGUAGES: readonly OcrLanguageId[] = ['por', 'eng'];

/** Do texto já lido nas páginas digitais, só este tanto entra na descoberta do idioma. */
const KNOWN_TEXT_SAMPLE_CHARS = 20_000;

/** Etapas da leitura que o usuário acompanha. */
export type OcrStage = Exclude<PdfReadStage, 'text'>;

export interface OcrReadHooks {
  onStage?: (stage: OcrStage) => void;
  /** Páginas reconhecidas (`done` de `total`). */
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
}

export interface OcrReadRequest {
  /** Chave do arquivo no cache em disco (hash do conteúdo). */
  fileKey: string;
  document: PdfDocumentHandle;
  /** Páginas (de 1 em diante) que precisam de reconhecimento. */
  pages: readonly number[];
  /** Texto das páginas que já tinham texto digital: ajuda a descobrir o idioma. */
  knownText: string;
  hooks?: OcrReadHooks;
}

export interface OcrReadResult {
  /** Linhas lidas de cada página aproveitável. */
  texts: Map<number, string[]>;
  /** Páginas lidas, mas sem texto confiável (foto, arte). */
  discardedPages: number[];
  /** Idiomas usados na leitura. */
  languages: OcrLanguageId[];
}

export interface OcrPageReaderDeps {
  engine: OcrEngine;
  packs: OcrLanguagePacks;
  cache: OcrPageCache;
}

/** Páginas espalhadas por igual entre as indicadas (as do meio de cada faixa). */
export function pickSamplePages(pages: readonly number[], count = LANGUAGE_SAMPLE_PAGES): number[] {
  if (pages.length <= count) {
    return [...pages];
  }

  return [
    ...new Set(
      Array.from(
        { length: count },
        (_, i) => pages[Math.floor(((i + 0.5) * pages.length) / count)],
      ),
    ),
  ];
}

/**
 * Lê as páginas que não têm texto digital, em quatro passos:
 * 1. lê uma amostra de páginas e descobre o(s) idioma(s) do documento (junto com o texto digital);
 * 2. garante que os idiomas estão instalados (baixa o que faltar);
 * 3. lê cada página com esses idiomas, gravando o resultado em disco, página a página;
 * 4. descarta as páginas em que o motor não achou texto confiável.
 * O motor trabalha numa página por vez e nada fica na memória além do texto já pronto.
 */
export class OcrPageReader {
  constructor(private readonly deps: OcrPageReaderDeps) {}

  async read(request: OcrReadRequest): Promise<OcrReadResult> {
    const hooks = request.hooks ?? {};

    hooks.onStage?.('language');

    const languages = await this.discoverLanguages(request, hooks);

    await this.ensureLanguages(languages, hooks);

    hooks.onStage?.('recognize');

    return this.recognizeAll(request, languages, hooks);
  }

  private async discoverLanguages(
    request: OcrReadRequest,
    hooks: OcrReadHooks,
  ): Promise<OcrLanguageId[]> {
    // depois de baixar o idioma da amostra, a tela volta a mostrar que está descobrindo o idioma
    if (await this.ensureLanguages([OCR_BOOTSTRAP_LANGUAGE], hooks)) {
      hooks.onStage?.('language');
    }

    const session = await this.deps.engine.open([OCR_BOOTSTRAP_LANGUAGE]);
    const samples: string[] = [request.knownText.slice(0, KNOWN_TEXT_SAMPLE_CHARS)];

    try {
      for (const page of pickSamplePages(request.pages)) {
        this.assertNotCancelled(hooks);

        samples.push((await this.readPage(request, session, 'sample', page)).join('\n'));
      }
    } finally {
      await session.close();
    }

    const detected = detectLanguages(samples.join('\n'), { maxLanguages: MAX_DOCUMENT_LANGUAGES });

    return detected.length > 0 ? detected.map((entry) => entry.language) : [...FALLBACK_LANGUAGES];
  }

  private async recognizeAll(
    request: OcrReadRequest,
    languages: OcrLanguageId[],
    hooks: OcrReadHooks,
  ): Promise<OcrReadResult> {
    const session = await this.deps.engine.open(languages);
    const texts = new Map<number, string[]>();
    const discardedPages: number[] = [];

    try {
      let done = 0;

      for (const page of request.pages) {
        this.assertNotCancelled(hooks);

        const lines = await this.readPage(request, session, 'page', page);

        if (lines.length > 0) {
          texts.set(page, lines);
        } else {
          discardedPages.push(page);
        }

        done += 1;
        hooks.onProgress?.(done, request.pages.length);
      }
    } finally {
      await session.close();
    }

    return { texts, discardedPages, languages };
  }

  /** Lê uma página (do disco, se já foi lida com o mesmo motor e idiomas) e grava o resultado. */
  private async readPage(
    request: OcrReadRequest,
    session: OcrSession,
    kind: OcrCacheKind,
    page: number,
  ): Promise<string[]> {
    const cached = await this.deps.cache.read(request.fileKey, kind, page);

    if (cached && cached.signature === session.signature) {
      return cached.lines;
    }

    if (!request.document.renderPage) {
      throw new PdfReadError(PdfProblem.OCR_UNAVAILABLE, PdfMessages.ocrUnavailable);
    }

    const image = await request.document.renderPage(page, OCR_LONG_EDGE_PX);
    const text = buildPageText(await session.recognize(image));

    await this.deps.cache.write(request.fileKey, kind, page, {
      signature: session.signature,
      lines: text.lines,
      confidence: text.confidence,
    });

    return text.lines;
  }

  /** Instala os idiomas que faltam. Devolve `true` se baixou algo. */
  private async ensureLanguages(
    languages: readonly OcrLanguageId[],
    hooks: OcrReadHooks,
  ): Promise<boolean> {
    const missing = languages.filter((language) => !this.deps.packs.locate(language));

    if (missing.length === 0) {
      return false;
    }

    hooks.onStage?.('download');

    try {
      await this.deps.packs.ensure(missing);
    } catch (error) {
      this.assertNotCancelled(hooks);

      throw new PdfReadError(
        PdfProblem.OCR_UNAVAILABLE,
        PdfMessages.ocrLanguageFailed(error instanceof Error ? error.message : ''),
        { cause: error },
      );
    }

    return true;
  }

  private assertNotCancelled(hooks: OcrReadHooks): void {
    if (hooks.isCancelled?.()) {
      throw new PdfReadError(PdfProblem.CANCELLED, PdfMessages.cancelled);
    }
  }
}
