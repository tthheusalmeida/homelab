import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { hashFile, OcrPageCache } from './ocr-page-cache';

const KEY = 'a'.repeat(24);
const page = (overrides = {}) => ({
  signature: 's',
  lines: [] as string[],
  confidence: 0,
  ...overrides,
});

describe('OcrPageCache', () => {
  let dir: string;
  let cache: OcrPageCache;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-cache-spec-'));
    cache = new OcrPageCache(dir);
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when a page was written, should read it back with its signature, lines and confidence', async () => {
    await cache.write(
      KEY,
      'page',
      7,
      page({ signature: 'por:fast', lines: ['um', 'dois'], confidence: 88 }),
    );

    await expect(cache.read(KEY, 'page', 7)).resolves.toEqual({
      signature: 'por:fast',
      lines: ['um', 'dois'],
      confidence: 88,
    });
  });

  it('when a page was never written, should read null', async () => {
    await expect(cache.read(KEY, 'page', 1)).resolves.toBeNull();
  });

  it('when samples and pages share a number, should keep them apart', async () => {
    await cache.write(KEY, 'sample', 3, page({ lines: ['a'] }));
    await cache.write(KEY, 'page', 3, page({ lines: ['b'] }));

    expect((await cache.read(KEY, 'sample', 3))?.lines).toEqual(['a']);
    expect((await cache.read(KEY, 'page', 3))?.lines).toEqual(['b']);
  });

  it('when a file is corrupt or has the wrong shape, should read null', async () => {
    fs.mkdirSync(path.join(dir, KEY));
    fs.writeFileSync(path.join(dir, KEY, 'page-0001.json'), '{ quebrado');
    fs.writeFileSync(path.join(dir, KEY, 'page-0002.json'), JSON.stringify({ lines: 'x' }));

    await expect(cache.read(KEY, 'page', 1)).resolves.toBeNull();
    await expect(cache.read(KEY, 'page', 2)).resolves.toBeNull();
  });

  it('when writing, should not leave a temporary file behind', async () => {
    await cache.write(KEY, 'page', 1, page());

    expect(fs.readdirSync(path.join(dir, KEY))).toEqual(['page-0001.json']);
  });

  it('when the key is not a valid hash, should refuse before touching the disk', async () => {
    await expect(cache.write('../fora', 'page', 1, page())).rejects.toThrow('inválida');
    await expect(cache.read('../fora', 'page', 1)).resolves.toBeNull();
  });

  it('when removing, should delete the whole folder of the file', async () => {
    await cache.write(KEY, 'page', 1, page());

    await cache.remove(KEY);

    expect(fs.existsSync(path.join(dir, KEY))).toBe(false);
  });
});

describe('hashFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-hash-spec-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when two files have the same content in different folders, should give the same 24-hex key', async () => {
    fs.mkdirSync(path.join(dir, 'a'));
    fs.writeFileSync(path.join(dir, 'x.pdf'), 'conteúdo');
    fs.writeFileSync(path.join(dir, 'a', 'y.pdf'), 'conteúdo');

    const first = await hashFile(path.join(dir, 'x.pdf'));

    expect(first).toMatch(/^[a-f0-9]{24}$/);
    expect(await hashFile(path.join(dir, 'a', 'y.pdf'))).toBe(first);
  });

  it('when the content differs, should give another key', async () => {
    fs.writeFileSync(path.join(dir, 'x.pdf'), 'um');
    fs.writeFileSync(path.join(dir, 'y.pdf'), 'dois');

    expect(await hashFile(path.join(dir, 'x.pdf'))).not.toBe(
      await hashFile(path.join(dir, 'y.pdf')),
    );
  });

  it('when the file does not exist, should reject', async () => {
    await expect(hashFile(path.join(dir, 'nada.pdf'))).rejects.toThrow();
  });
});
