import type { OcrLanguagePacks } from '../back/modules/pdf/ocr/ocr-engine.port';
import {
  OCR_AUTO_INSTALL_QUALITY,
  OCR_QUALITIES,
  ocrComponentId,
  type OcrLanguageId,
  type OcrQuality,
} from '../back/modules/pdf/ocr/ocr-languages';
import type { ComponentsService } from './components.service';

export const OcrPackMessages = {
  failed: 'O download dos dados de idioma não terminou.',
} as const;

/** A parte do `ComponentsService` que os idiomas usam. */
export type OcrComponents = Pick<
  ComponentsService,
  'install' | 'whenIdle' | 'fileOf' | 'failureOf'
>;

/** Qualidades em ordem de preferência: a de alta qualidade, se instalada, vale mais que a rápida. */
const PREFERENCE: readonly OcrQuality[] = [...OCR_QUALITIES].reverse();

/**
 * Idiomas do reconhecimento de texto, vindos do catálogo de componentes (mesmo download com
 * checksum e mesma tela de Configurações > Componentes). O que falta é baixado sozinho, na
 * qualidade rápida (pequena); quem quiser a de alta qualidade a instala em Componentes.
 */
export class ComponentOcrPacks implements OcrLanguagePacks {
  constructor(private readonly components: OcrComponents) {}

  locate(language: OcrLanguageId): { file: string; quality: OcrQuality } | null {
    for (const quality of PREFERENCE) {
      const file = this.components.fileOf(ocrComponentId(language, quality));

      if (file) {
        return { file, quality };
      }
    }

    return null;
  }

  async ensure(languages: readonly OcrLanguageId[]): Promise<void> {
    const missing = languages.filter((language) => !this.locate(language));

    if (missing.length === 0) {
      return;
    }

    const ids = missing.map((language) => ocrComponentId(language, OCR_AUTO_INSTALL_QUALITY));

    await this.components.install(ids);
    await this.components.whenIdle();

    const failed = ids.find((id) => this.components.fileOf(id) === null);

    if (failed) {
      throw new Error(this.components.failureOf(failed) ?? OcrPackMessages.failed);
    }
  }
}
