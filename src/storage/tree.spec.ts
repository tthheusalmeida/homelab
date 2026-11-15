import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ProgressEventPayload } from '../shared/contracts/events';
import { IpcError } from '../shared/errors';
import { makeTempDir, removeDir } from '../settings/settings.testing';

import { copyTree, isEmptyDir, isSameOrInside, scanTree, throttleProgress } from './tree';

function write(root: string, relative: string, content: string): void {
  const target = path.join(root, ...relative.split('/'));

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

describe('tree', () => {
  let dir: string;
  let source: string;
  let destination: string;

  beforeEach(() => {
    dir = makeTempDir();
    source = path.join(dir, 'origem');
    destination = path.join(dir, 'destino');
  });

  afterEach(() => removeDir(dir));

  describe('isSameOrInside', () => {
    it('when the paths are the same or one contains the other, should answer true only from the parent', () => {
      expect(isSameOrInside(source, source)).toBe(true);
      expect(isSameOrInside(source, path.join(source, 'a', 'b'))).toBe(true);
      expect(isSameOrInside(path.join(source, 'a'), source)).toBe(false);
    });

    it('when a sibling folder shares the same prefix, should not count it as inside', () => {
      expect(isSameOrInside(source, `${source}-outra`)).toBe(false);
    });
  });

  describe('isEmptyDir', () => {
    it('when the folder does not exist or has no entries, should answer true', async () => {
      fs.mkdirSync(source);

      await expect(isEmptyDir(source)).resolves.toBe(true);
      await expect(isEmptyDir(path.join(dir, 'nao-existe'))).resolves.toBe(true);
    });

    it('when the folder has any entry, should answer false', async () => {
      write(source, 'a.md', 'x');

      await expect(isEmptyDir(source)).resolves.toBe(false);
    });
  });

  describe('scanTree', () => {
    it('when scanning, should list files with size, subfolders (including empty ones) and the total', async () => {
      write(source, 'a.md', 'abc');
      write(source, 'books/b.json', '12345');
      fs.mkdirSync(path.join(source, 'vazia'));

      const scan = await scanTree(source);

      expect(scan.files.map((file) => [file.relativePath, file.size]).sort()).toEqual([
        ['a.md', 3],
        ['books/b.json', 5],
      ]);
      expect(scan.dirs.sort()).toEqual(['books', 'vazia']);
      expect(scan.totalBytes).toBe(8);
    });

    it('when the folder does not exist, should answer an empty scan', async () => {
      await expect(scanTree(path.join(dir, 'nao-existe'))).resolves.toEqual({
        files: [],
        dirs: [],
        totalBytes: 0,
      });
    });
  });

  describe('copyTree', () => {
    it('when copying, should recreate files and folders in the destination and keep the origin untouched', async () => {
      write(source, 'a.md', 'abc');
      write(source, 'books/b.json', '12345');
      fs.mkdirSync(path.join(source, 'vazia'));

      const result = await copyTree(source, destination);

      expect(result).toEqual({ files: 2, bytes: 8 });
      expect(fs.readFileSync(path.join(destination, 'a.md'), 'utf8')).toBe('abc');
      expect(fs.readFileSync(path.join(destination, 'books', 'b.json'), 'utf8')).toBe('12345');
      expect(fs.existsSync(path.join(destination, 'vazia'))).toBe(true);
      expect(fs.readFileSync(path.join(source, 'a.md'), 'utf8')).toBe('abc');
    });

    it('when copying, should report progress through preparing, running, verifying and done', async () => {
      write(source, 'a.md', 'a');
      write(source, 'b.md', 'b');
      const seen: ProgressEventPayload[] = [];

      await copyTree(source, destination, (progress) => seen.push(progress));

      expect(seen.map((progress) => progress.phase)).toEqual([
        'preparing',
        'running',
        'running',
        'verifying',
        'done',
      ]);
      expect(seen[2]).toMatchObject({ processed: 2, total: 2 });
      expect(seen.filter((p) => p.phase === 'running').map((p) => p.currentFile)).toEqual([
        'a.md',
        'b.md',
      ]);
    });

    it('when the origin does not exist, should create an empty destination without failing', async () => {
      await expect(copyTree(path.join(dir, 'nao-existe'), destination)).resolves.toEqual({
        files: 0,
        bytes: 0,
      });
      expect(fs.existsSync(destination)).toBe(true);
    });

    it('when a file already exists in the destination, should fail with PERSIST_FAILED, undo what it created and not overwrite', async () => {
      write(source, 'a.md', 'novo');
      write(source, 'b.md', 'novo');
      write(destination, 'b.md', 'ja existia');

      const attempt = copyTree(source, destination);

      await expect(attempt).rejects.toBeInstanceOf(IpcError);
      await expect(attempt).rejects.toMatchObject({ code: 'PERSIST_FAILED' });
      expect(fs.readFileSync(path.join(destination, 'b.md'), 'utf8')).toBe('ja existia');
      expect(fs.existsSync(path.join(destination, 'a.md'))).toBe(false);
      expect(fs.existsSync(path.join(source, 'a.md'))).toBe(true);
    });

    it('when the copy fails halfway through new folders, should remove the folders it created but keep the pre-existing destination', async () => {
      write(source, 'sub/a.md', 'a');
      write(source, 'sub/b.md', 'b');
      fs.mkdirSync(destination);
      write(destination, 'sub/b.md', 'ja existia');

      await expect(copyTree(source, destination)).rejects.toMatchObject({ code: 'PERSIST_FAILED' });

      expect(fs.readFileSync(path.join(destination, 'sub', 'b.md'), 'utf8')).toBe('ja existia');
      expect(fs.existsSync(path.join(destination, 'sub', 'a.md'))).toBe(false);
    });

    it('when the failure happens in a brand new destination, should leave no destination folder behind', async () => {
      write(source, 'a.md', 'a');
      const copyFile = jest
        .spyOn(fs.promises, 'copyFile')
        .mockRejectedValueOnce(new Error('disco cheio'));

      try {
        await expect(copyTree(source, destination)).rejects.toThrow(/disco cheio/);
        expect(fs.existsSync(destination)).toBe(false);
      } finally {
        copyFile.mockRestore();
      }
    });
  });

  describe('throttleProgress', () => {
    const running = (processed: number): ProgressEventPayload => ({
      phase: 'running',
      processed,
      total: 100,
    });

    it('when many events arrive at once, should forward the first, the phase changes and the last', () => {
      const listener = jest.fn();
      const throttled = throttleProgress(listener, 60_000);

      throttled({ phase: 'preparing', processed: 0, total: 0 });
      throttled(running(1));
      throttled(running(2));
      throttled(running(3));
      throttled(running(100));
      throttled({ phase: 'done', processed: 100, total: 100 });

      expect(listener.mock.calls.map(([progress]) => [progress.phase, progress.processed])).toEqual(
        [
          ['preparing', 0],
          ['running', 1],
          ['running', 100],
          ['done', 100],
        ],
      );
    });

    it('when enough time passes between events, should forward them again', () => {
      const listener = jest.fn();
      const now = jest.spyOn(Date, 'now');
      const throttled = throttleProgress(listener, 100);

      now.mockReturnValue(1_000);
      throttled(running(1));
      now.mockReturnValue(1_050);
      throttled(running(2));
      now.mockReturnValue(1_200);
      throttled(running(3));
      now.mockRestore();

      expect(listener.mock.calls.map(([progress]) => progress.processed)).toEqual([1, 3]);
    });
  });
});
