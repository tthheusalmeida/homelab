import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  COMPONENT_TEMPLATES,
  WINDOWS_BIN_PACKAGE,
  catalogFor,
  findComponent,
  modelSpecs,
  platformTarget,
} from './component-manifest';
import {
  OCR_LANGUAGE_IDS,
  OCR_LANGUAGES,
  OCR_MODEL_SOURCES,
  OCR_QUALITIES,
} from '../back/modules/pdf/ocr/ocr-languages';

const WINDOWS = 'win32-x64';
const LINUX = 'linux-x64';

describe('COMPONENT_TEMPLATES', () => {
  it('when listing the components, should have unique ids', () => {
    const ids = COMPONENT_TEMPLATES.map((spec) => spec.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([WINDOWS, LINUX])(
    'when a component is downloadable on %s, should have an https url and a sha256',
    (target) => {
      const downloaded = catalogFor(target).filter(
        (item) =>
          item.kind !== 'bundled' && item.kind !== 'ollama-model' && item.kind !== 'ollama-pull',
      );

      for (const spec of downloaded) {
        expect(spec.download?.url).toMatch(/^https:\/\//);
        expect(spec.download?.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(spec.sizeBytes).toBeGreaterThan(0);
      }
    },
  );

  it.each([WINDOWS, LINUX])(
    'when a component is bundled on %s, should be required and have nothing to download',
    (target) => {
      for (const spec of catalogFor(target).filter((item) => item.kind === 'bundled')) {
        expect(spec.required).toBe(true);
        expect(spec.download).toBeUndefined();
      }
    },
  );

  it('when showing the components, should not expose tool or system names in labels or descriptions', () => {
    for (const template of COMPONENT_TEMPLATES) {
      expect(`${template.label} ${template.description}`).not.toMatch(
        /ffmpeg|yt-dlp|whisper|cuda|large-v3|turbo|tesseract|traineddata|ollama|qwen|\.exe|win32|linux/i,
      );
    }
  });
});

describe('OCR language entries', () => {
  const ocr = (target: string) => catalogFor(target).filter((spec) => spec.group === 'ocr');

  it.each([WINDOWS, LINUX])(
    'when building the catalog for %s, should have one entry per language and quality',
    (target) => {
      expect(ocr(target)).toHaveLength(OCR_LANGUAGE_IDS.length * OCR_QUALITIES.length);
    },
  );

  it('when listing the entries, should be optional files that need no system variant', () => {
    for (const spec of ocr(WINDOWS)) {
      expect(spec.required).toBe(false);
      expect(spec.kind).toBe('file');
    }

    expect(ocr(WINDOWS).map((spec) => spec.id)).toEqual(ocr(LINUX).map((spec) => spec.id));
  });

  it('when installing an entry, should keep each quality in its own folder so same-named files do not collide', () => {
    const files = ocr(WINDOWS).map((spec) => spec.file);

    expect(new Set(files).size).toBe(files.length);
    expect(files).toContain('ocr/fast/por.traineddata');
    expect(files).toContain('ocr/best/por.traineddata');
  });

  it('when downloading an entry, should use the pinned source and the checksum of the registry', () => {
    const best = findComponent('ocr-fra-best', WINDOWS)!;

    expect(best.download).toEqual({
      url: `${OCR_MODEL_SOURCES.best}/fra.traineddata`,
      sha256: OCR_LANGUAGES.fra.models.best.sha256,
    });
    expect(best.sizeBytes).toBe(OCR_LANGUAGES.fra.models.best.sizeBytes);
  });

  it('when showing an entry, should name the language and the quality in Portuguese', () => {
    expect(findComponent('ocr-por-fast', WINDOWS)?.label).toBe('Português (rápido)');
    expect(findComponent('ocr-eng-best', WINDOWS)?.label).toBe('Inglês (alta qualidade)');
  });

  it('when listing the Whisper models, should not include the language entries', () => {
    expect(modelSpecs(WINDOWS).some((spec) => spec.id.startsWith('ocr-'))).toBe(false);
  });
});

describe('assistente local', () => {
  const runtime = () => findComponent('ollama-runtime', WINDOWS);
  const assistants = () => catalogFor(WINDOWS).filter((spec) => spec.group === 'llm');

  it('when asking for Windows, should offer the program as an optional package pinned by checksum', () => {
    expect(runtime()).toMatchObject({
      group: 'assistant',
      kind: 'zip',
      required: false,
      extractTo: 'ollama',
      provides: ['ollama.exe'],
    });
    expect(runtime()?.download?.url).toMatch(
      /^https:\/\/github\.com\/ollama\/ollama\/releases\/download\/v[\d.]+\/ollama-windows-amd64\.zip$/,
    );
    expect(runtime()?.download?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("when asking for Linux, should not offer the program, but offer the models to pull into the user's own Ollama", () => {
    const models = catalogFor(LINUX).filter((spec) => spec.group === 'llm');

    expect(findComponent('ollama-runtime', LINUX)).toBeUndefined();
    expect(models.map((spec) => spec.id)).toEqual(assistants().map((spec) => spec.id));
    expect(models.every((spec) => spec.kind === 'ollama-pull' && spec.download === undefined)).toBe(
      true,
    );
  });

  it('when listing the assistants, should go from light to heavy with growing sizes', () => {
    const sizes = assistants().map((spec) => spec.sizeBytes);

    expect(assistants().map((spec) => spec.id)).toEqual([
      'llm-light',
      'llm-balanced',
      'llm-strong',
      'llm-max',
      'llm-embedding',
    ]);
    // o modelo de vetores fica no fim da lista, fora da escada dos assistentes
    const ladder = sizes.slice(0, -1);

    expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
  });

  it('when listing the assistants, should be optional models fetched by reference, not by download', () => {
    for (const spec of assistants()) {
      expect(spec).toMatchObject({ kind: 'ollama-model', required: false });
      expect(spec.file).toMatch(/^(qwen3\.5:\d+(\.\d+)?b|embeddinggemma)$/);
      expect(spec.download).toBeUndefined();
    }
  });

  it('when listing the Whisper models, should not include the assistants', () => {
    expect(modelSpecs(WINDOWS).some((spec) => spec.group === 'llm')).toBe(false);
  });
});

describe('catalogFor', () => {
  it('when asking for Windows, should keep the CUDA pack as a zip of DLLs', () => {
    expect(findComponent('cuda-pack', WINDOWS)?.kind).toBe('zip');
  });

  it('when asking for Linux, should not offer the CUDA pack', () => {
    expect(findComponent('cuda-pack', LINUX)).toBeUndefined();
  });

  it('when asking for a system with no variant, should keep only what is not system specific', () => {
    const ids = catalogFor('darwin-arm64').map((spec) => spec.id);

    expect(ids).not.toContain('ffmpeg');
    expect(ids).toContain('model-small');
  });

  it('when asking for ffmpeg, should be bundled on Windows and downloaded on Linux', () => {
    expect(findComponent('ffmpeg', WINDOWS)?.kind).toBe('bundled');
    expect(findComponent('ffmpeg', LINUX)?.kind).toBe('binary');
  });

  it('when asking for the transcription, should be a downloaded package on Windows and a program on Linux', () => {
    expect(findComponent('whisper-runtime', WINDOWS)?.kind).toBe('zip');
    expect(findComponent('whisper-runtime', LINUX)?.kind).toBe('binary');
    expect(findComponent('whisper-runtime', LINUX)?.download?.url).toContain('/components-v1/');
  });

  it('when asking for the transcription on Windows, should be required and downloaded, not only checked', () => {
    const spec = findComponent('whisper-runtime', WINDOWS);

    expect(spec?.required).toBe(true);
    expect(spec?.download?.url).toBe(WINDOWS_BIN_PACKAGE.url);
    expect(spec?.provides).toEqual(expect.arrayContaining(['whisper-cli.exe', 'whisper.dll']));
  });

  it('when the Windows package is declared, should match the file the CI embeds (windows-bin.json)', () => {
    const lock = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'windows-bin.json'), 'utf8'),
    ) as { url: string; sha256: string };

    expect(WINDOWS_BIN_PACKAGE.url).toBe(lock.url);
    expect(WINDOWS_BIN_PACKAGE.sha256).toBe(lock.sha256);
  });

  it('when the Windows package is downloaded, should come from the project release, not a third party', () => {
    expect(WINDOWS_BIN_PACKAGE.url).toMatch(
      /^https:\/\/github\.com\/tthheusalmeida\/homelab\/releases\/download\/bin-v1\//,
    );
    expect(WINDOWS_BIN_PACKAGE.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('when looking up an unknown id, should return undefined', () => {
    expect(findComponent('nao-existe', WINDOWS)).toBeUndefined();
  });

  it('when looking up yt-dlp, should be an optional single program from the official releases', () => {
    for (const target of [WINDOWS, LINUX]) {
      const spec = findComponent('yt-dlp', target);

      expect(spec?.kind).toBe('binary');
      expect(spec?.required).toBe(false);
      expect(spec?.download?.url).toMatch(
        /^https:\/\/github\.com\/yt-dlp\/yt-dlp\/releases\/download\//,
      );
    }
  });

  it('when listing models, should only return the model group', () => {
    expect(modelSpecs(LINUX).every((spec) => spec.group === 'model')).toBe(true);
    expect(modelSpecs(LINUX).length).toBeGreaterThan(1);
  });

  it('when building the target key, should join system and architecture', () => {
    expect(platformTarget('linux', 'x64')).toBe(LINUX);
  });
});
