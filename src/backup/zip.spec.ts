import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

import { makeTempDir, removeDir } from '../settings/settings.testing';

import {
  extractZip,
  listZip,
  readZipText,
  safeEntryTarget,
  writeZip,
  type ZipEntryToWrite,
} from './zip';

function write(root: string, relative: string, content: string): string {
  const target = path.join(root, ...relative.split('/'));

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);

  return target;
}

/** Zip mínimo, escrito à mão, com uma entrada sem compressão (permite nomes que o `yazl` recusaria). */
function craftZip(entryName: string, content: string): Buffer {
  const name = Buffer.from(entryName, 'utf8');
  const data = Buffer.from(content, 'utf8');
  const crc = zlib.crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0x21, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const localPart = Buffer.concat([local, name, data]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);

  const centralPart = Buffer.concat([central, name]);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralPart.length, 12);
  end.writeUInt32LE(localPart.length, 16);

  return Buffer.concat([localPart, centralPart, end]);
}

describe('zip', () => {
  let dir: string;
  let source: string;
  let target: string;

  beforeEach(() => {
    dir = makeTempDir();
    source = path.join(dir, 'origem');
    target = path.join(dir, 'saida', 'backup.zip');
  });

  afterEach(() => removeDir(dir));

  describe('writeZip', () => {
    it('when writing files and buffers, should create a zip that lists every entry and keeps the contents', async () => {
      const entries: ZipEntryToWrite[] = [
        { name: 'manifest.json', source: { buffer: Buffer.from('{"ok":true}') } },
        { name: 'library/ola.md', source: { file: write(source, 'ola.md', '# Olá') } },
        {
          name: 'library/books/livro.json',
          source: { file: write(source, 'books/livro.json', '{"id":1}') },
        },
      ];

      const result = await writeZip(target, entries);

      expect(result.bytes).toBe(fs.statSync(target).size);
      expect((await listZip(target)).map((entry) => entry.name).sort()).toEqual([
        'library/books/livro.json',
        'library/ola.md',
        'manifest.json',
      ]);
      await expect(readZipText(target, 'library/ola.md')).resolves.toBe('# Olá');
      await expect(readZipText(target, 'manifest.json')).resolves.toBe('{"ok":true}');
    });

    it('when writing, should create the destination folder and leave no .partial file behind', async () => {
      await writeZip(target, [{ name: 'a.txt', source: { buffer: Buffer.from('a') } }]);

      expect(fs.readdirSync(path.dirname(target))).toEqual(['backup.zip']);
    });

    it('when writing, should report progress after each entry with the total', async () => {
      const seen: Array<[string, number, number]> = [];

      await writeZip(
        target,
        [
          { name: 'a.txt', source: { buffer: Buffer.from('a') } },
          { name: 'b.txt', source: { file: write(source, 'b.txt', 'b') } },
          { name: 'c.txt', source: { file: write(source, 'c.txt', 'c') } },
        ],
        { onEntry: (name, done, total) => seen.push([name, done, total]) },
      );

      expect(seen).toEqual([
        ['a.txt', 1, 3],
        ['b.txt', 2, 3],
        ['c.txt', 3, 3],
      ]);
    });

    it('when the destination already exists, should replace it', async () => {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, 'zip antigo');

      await writeZip(target, [{ name: 'novo.txt', source: { buffer: Buffer.from('n') } }]);

      expect((await listZip(target)).map((entry) => entry.name)).toEqual(['novo.txt']);
    });

    it('when cancelled in the middle, should throw AbortError and leave neither the zip nor a partial file', async () => {
      const controller = new AbortController();
      const entries = ['a', 'b', 'c'].map((name) => ({
        name: `${name}.txt`,
        source: { file: write(source, `${name}.txt`, name.repeat(100)) },
      }));

      const attempt = writeZip(target, entries, {
        signal: controller.signal,
        onEntry: (_name, done) => {
          if (done === 1) {
            controller.abort();
          }
        },
      });

      await expect(attempt).rejects.toMatchObject({ name: 'AbortError' });
      expect(fs.existsSync(target)).toBe(false);
      expect(fs.existsSync(`${target}.partial`)).toBe(false);
    });

    it('when already cancelled before starting, should throw AbortError without creating anything', async () => {
      const controller = new AbortController();

      controller.abort();

      await expect(
        writeZip(target, [{ name: 'a.txt', source: { buffer: Buffer.from('a') } }], {
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(fs.existsSync(target)).toBe(false);
      expect(fs.existsSync(`${target}.partial`)).toBe(false);
    });

    it('when a source file disappeared, should fail with PERSIST_FAILED and leave no partial file', async () => {
      await expect(
        writeZip(target, [{ name: 'a.txt', source: { file: path.join(source, 'sumiu.txt') } }]),
      ).rejects.toMatchObject({ code: 'PERSIST_FAILED' });
      expect(fs.existsSync(target)).toBe(false);
      expect(fs.existsSync(`${target}.partial`)).toBe(false);
    });

    it('when the zip has no entries, should still create a valid empty zip', async () => {
      await writeZip(target, []);

      await expect(listZip(target)).resolves.toEqual([]);
    });
  });

  describe('reading', () => {
    it('when the file is not a zip, should reject with VALIDATION', async () => {
      const fake = write(dir, 'falso.zip', 'isto não é um zip');

      await expect(listZip(fake)).rejects.toMatchObject({ code: 'VALIDATION' });
      await expect(readZipText(fake, 'manifest.json')).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });

    it('when the file does not exist, should reject with VALIDATION', async () => {
      await expect(listZip(path.join(dir, 'nao-existe.zip'))).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });

    it('when the entry does not exist, should answer null', async () => {
      await writeZip(target, [{ name: 'a.txt', source: { buffer: Buffer.from('a') } }]);

      await expect(readZipText(target, 'outro.txt')).resolves.toBeNull();
    });

    it('when listing, should flag folders and report sizes', async () => {
      await writeZip(target, [{ name: 'a.txt', source: { buffer: Buffer.from('12345') } }]);

      expect(await listZip(target)).toEqual([{ name: 'a.txt', size: 5, isDirectory: false }]);
    });
  });

  describe('extractZip', () => {
    it('when extracting, should recreate the folders and files', async () => {
      await writeZip(target, [
        { name: 'library/ola.md', source: { file: write(source, 'ola.md', '# Olá') } },
        {
          name: 'library/books/livro.json',
          source: { file: write(source, 'books/livro.json', '{}') },
        },
        { name: 'data/jobs.json', source: { buffer: Buffer.from('[]') } },
      ]);
      const out = path.join(dir, 'extraido');

      const result = await extractZip(target, out);

      expect(result.files).toBe(3);
      expect(fs.readFileSync(path.join(out, 'library', 'ola.md'), 'utf8')).toBe('# Olá');
      expect(fs.readFileSync(path.join(out, 'library', 'books', 'livro.json'), 'utf8')).toBe('{}');
      expect(fs.readFileSync(path.join(out, 'data', 'jobs.json'), 'utf8')).toBe('[]');
    });

    it('when a filter is given, should extract only the accepted entries', async () => {
      await writeZip(target, [
        { name: 'library/a.md', source: { buffer: Buffer.from('a') } },
        { name: 'inbox/b.md', source: { buffer: Buffer.from('b') } },
      ]);
      const out = path.join(dir, 'extraido');

      await extractZip(target, out, { accept: (name) => name.startsWith('inbox/') });

      expect(fs.existsSync(path.join(out, 'inbox', 'b.md'))).toBe(true);
      expect(fs.existsSync(path.join(out, 'library'))).toBe(false);
    });

    it('when extracting, should report each extracted file', async () => {
      await writeZip(target, [
        { name: 'a.md', source: { buffer: Buffer.from('a') } },
        { name: 'b.md', source: { buffer: Buffer.from('b') } },
      ]);
      const seen: Array<[string, number]> = [];

      await extractZip(target, path.join(dir, 'extraido'), {
        onEntry: (name, done) => seen.push([name, done]),
      });

      expect(seen).toEqual([
        ['a.md', 1],
        ['b.md', 2],
      ]);
    });

    it('when cancelled, should throw AbortError', async () => {
      await writeZip(target, [{ name: 'a.md', source: { buffer: Buffer.from('a') } }]);
      const controller = new AbortController();

      controller.abort();

      await expect(
        extractZip(target, path.join(dir, 'extraido'), { signal: controller.signal }),
      ).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('when an entry tries to escape the destination (zip-slip), should reject and write nothing outside', async () => {
      const evil = path.join(dir, 'evil.zip');

      fs.writeFileSync(evil, craftZip('../evil.txt', 'perigo'));

      await expect(extractZip(evil, path.join(dir, 'extraido'))).rejects.toMatchObject({
        code: 'VALIDATION',
      });
      expect(fs.existsSync(path.join(dir, 'evil.txt'))).toBe(false);
    });

    it('when the zip is not valid, should reject with VALIDATION', async () => {
      const fake = write(dir, 'falso.zip', 'lixo');

      await expect(extractZip(fake, path.join(dir, 'extraido'))).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });
  });

  describe('safeEntryTarget', () => {
    const base = path.resolve('/destino');

    it('when the name is a normal relative path, should answer the path inside the destination', () => {
      expect(safeEntryTarget(base, 'library/books/a.json')).toBe(
        path.join(base, 'library', 'books', 'a.json'),
      );
    });

    it.each([
      ['an empty name', ''],
      ['parent folders', '../fora.txt'],
      ['parent folders in the middle', 'library/../../fora.txt'],
      ['an absolute path', '/etc/passwd'],
      ['a drive letter', 'C:/Windows/x.txt'],
      ['a backslash', 'library\\a.md'],
      ['a current-folder segment', './a.md'],
      ['a null byte', 'a\0.md'],
      ['only a slash', '/'],
    ])('when the name has %s, should reject with VALIDATION', (_label, name) => {
      expect(() => safeEntryTarget(base, name)).toThrow(
        expect.objectContaining({ code: 'VALIDATION' }),
      );
    });
  });
});
