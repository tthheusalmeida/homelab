import { LANGUAGE_WORDS } from './language-profiles';
import {
  OCR_LANGUAGE_IDS,
  OCR_LANGUAGES,
  OCR_MODEL_SOURCES,
  OCR_QUALITIES,
  isOcrLanguageId,
  ocrComponentFile,
  ocrComponentId,
  ocrModelFile,
} from './ocr-languages';

describe('OCR language registry', () => {
  it.each(OCR_LANGUAGE_IDS)(
    'when listing %s, should have a label and both qualities with a checksum',
    (id) => {
      const language = OCR_LANGUAGES[id];

      expect(language.label).not.toBe('');

      for (const quality of OCR_QUALITIES) {
        expect(language.models[quality].sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(language.models[quality].sizeBytes).toBeGreaterThan(0);
      }
    },
  );

  it.each(OCR_LANGUAGE_IDS)('when listing %s, should have words to detect it', (id) => {
    expect(LANGUAGE_WORDS[id].length).toBeGreaterThan(30);
  });

  it('when the model sources are declared, should be pinned to a commit and not to a moving branch', () => {
    for (const source of Object.values(OCR_MODEL_SOURCES)) {
      expect(source).toMatch(/^https:\/\/raw\.githubusercontent\.com\/.+\/[0-9a-f]{40}$/);
    }
  });

  it('when the fast model is chosen, should be smaller than the best one for every language', () => {
    for (const id of OCR_LANGUAGE_IDS) {
      expect(OCR_LANGUAGES[id].models.fast.sizeBytes).toBeLessThan(
        OCR_LANGUAGES[id].models.best.sizeBytes,
      );
    }
  });

  it('when naming files and components, should follow one pattern', () => {
    expect(ocrModelFile('por')).toBe('por.traineddata');
    expect(ocrComponentId('fra', 'best')).toBe('ocr-fra-best');
    expect(ocrComponentFile('eng', 'fast')).toBe('ocr/fast/eng.traineddata');
  });

  it('when checking an id, should accept only registered languages', () => {
    expect(isOcrLanguageId('por')).toBe(true);
    expect(isOcrLanguageId('xyz')).toBe(false);
  });
});
