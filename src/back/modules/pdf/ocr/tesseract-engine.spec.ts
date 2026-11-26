import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { OcrLanguageId } from './ocr-languages';
import {
  OcrEngineMessages,
  outOfAsar,
  TesseractOcrEngine,
  type TesseractModule,
} from './tesseract-engine';

const PATHS = { workerPath: '/w/index.js', corePath: '/core' };

describe('outOfAsar', () => {
  it('when the path is inside the app package, should point to the unpacked folder', () => {
    expect(outOfAsar('C:\\App\\resources\\app.asar\\node_modules\\x\\a.js')).toBe(
      'C:\\App\\resources\\app.asar.unpacked\\node_modules\\x\\a.js',
    );
    expect(outOfAsar('/opt/app/resources/app.asar/node_modules/x/a.js')).toBe(
      '/opt/app/resources/app.asar.unpacked/node_modules/x/a.js',
    );
  });

  it('when the path is not inside the package (development), should keep it', () => {
    expect(outOfAsar('/home/dev/node_modules/x/a.js')).toBe('/home/dev/node_modules/x/a.js');
  });
});

describe('TesseractOcrEngine', () => {
  let dir: string;
  let seenLangPath: string | undefined;
  let filesSeen: string[];
  let terminate: jest.Mock;
  let createWorker: jest.Mock;
  let recognize: jest.Mock;

  const file = (name: string) => {
    const target = path.join(dir, name);

    fs.writeFileSync(target, `dados de ${name}`);

    return target;
  };

  const engine = (installed: Partial<Record<OcrLanguageId, 'fast' | 'best'>>) =>
    new TesseractOcrEngine(
      {
        locate: (language) =>
          installed[language]
            ? {
                file: file(`${language}-${installed[language]}.src`),
                quality: installed[language]!,
              }
            : null,
      },
      async () => ({ createWorker }) as unknown as TesseractModule,
      () => PATHS,
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-engine-spec-'));
    seenLangPath = undefined;
    filesSeen = [];
    terminate = jest.fn().mockResolvedValue(undefined);
    recognize = jest.fn();
    createWorker = jest.fn(
      async (_languages: string, _mode: number, options: { langPath: string }) => {
        seenLangPath = options.langPath;
        filesSeen = fs.readdirSync(options.langPath).sort();

        return { recognize, terminate };
      },
    );
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when opening, should gather each language data in one folder under the name the reader expects', async () => {
    const session = await engine({ por: 'best', eng: 'fast' }).open(['por', 'eng']);

    expect(filesSeen).toEqual(['eng.traineddata', 'por.traineddata']);
    expect(fs.readFileSync(path.join(seenLangPath!, 'por.traineddata'), 'utf-8')).toBe(
      'dados de por-best.src',
    );

    await session.close();
  });

  it('when opening, should read only local data, never download, and keep the reader off the main thread', async () => {
    const session = await engine({ por: 'fast' }).open(['por']);

    expect(createWorker).toHaveBeenCalledWith('por', 1, {
      ...PATHS,
      langPath: seenLangPath,
      gzip: false,
      cacheMethod: 'none',
    });

    await session.close();
  });

  it('when mixing languages, should join them for the reader and sign the qualities used', async () => {
    const session = await engine({ por: 'best', fra: 'fast' }).open(['por', 'fra']);

    expect(createWorker.mock.calls[0][0]).toBe('por+fra');
    expect(session.signature).toBe('por:best+fra:fast');

    await session.close();
  });

  it('when recognizing, should return the lines of words with their confidence', async () => {
    recognize.mockResolvedValue({
      data: {
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    words: [
                      { text: 'Olá', confidence: 96.4, bbox: {} },
                      { text: 'mundo', confidence: 91 },
                    ],
                  },
                  { words: [{ text: 'fim', confidence: 80 }] },
                ],
              },
            ],
          },
        ],
      },
    });
    const session = await engine({ por: 'fast' }).open(['por']);

    const lines = await session.recognize(new Uint8Array([1]));

    expect(lines).toEqual([
      [
        { text: 'Olá', confidence: 96.4 },
        { text: 'mundo', confidence: 91 },
      ],
      [{ text: 'fim', confidence: 80 }],
    ]);
    expect(recognize).toHaveBeenCalledWith(new Uint8Array([1]), {}, { blocks: true });

    await session.close();
  });

  it('when the reader finds no blocks (blank image), should return no lines', async () => {
    recognize.mockResolvedValue({ data: { blocks: null } });
    const session = await engine({ por: 'fast' }).open(['por']);

    await expect(session.recognize(new Uint8Array([1]))).resolves.toEqual([]);

    await session.close();
  });

  it('when closing, should stop the worker and delete the temporary folder', async () => {
    const session = await engine({ por: 'fast' }).open(['por']);

    await session.close();

    expect(terminate).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(seenLangPath!)).toBe(false);
  });

  it('when stopping the worker fails, should still delete the temporary folder', async () => {
    terminate.mockRejectedValue(new Error('já parou'));
    const session = await engine({ por: 'fast' }).open(['por']);

    await expect(session.close()).resolves.toBeUndefined();
    expect(fs.existsSync(seenLangPath!)).toBe(false);
  });

  it('when a language is not installed, should fail naming it and leave no folder behind', async () => {
    const before = fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('homelab-ocr-'));

    await expect(engine({ por: 'fast' }).open(['por', 'deu'])).rejects.toThrow(
      OcrEngineMessages.languageMissing('deu'),
    );

    expect(createWorker).not.toHaveBeenCalled();
    expect(fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('homelab-ocr-'))).toEqual(
      before,
    );
  });

  it('when the worker cannot start, should delete the temporary folder and pass the error on', async () => {
    createWorker.mockImplementation(
      async (_l: string, _m: number, options: { langPath: string }) => {
        seenLangPath = options.langPath;
        throw new Error('worker não iniciou');
      },
    );

    await expect(engine({ por: 'fast' }).open(['por'])).rejects.toThrow('worker não iniciou');
    expect(fs.existsSync(seenLangPath!)).toBe(false);
  });
});
