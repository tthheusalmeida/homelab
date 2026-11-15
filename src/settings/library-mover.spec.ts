import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ProgressEventPayload } from '../shared/contracts/events';

import { LibraryMover, type LibrarySettingsPort } from './library-mover';
import { makeTempDir, removeDir } from './settings.testing';

function write(root: string, relative: string, content: string): void {
  const target = path.join(root, ...relative.split('/'));

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

describe('LibraryMover', () => {
  let dir: string;
  let current: string;
  let target: string;
  let libraryDir: string;
  let settings: LibrarySettingsPort & { setLibraryDir: jest.Mock };
  let progress: ProgressEventPayload[];

  const create = () => new LibraryMover(settings, (event) => progress.push(event));

  beforeEach(() => {
    dir = makeTempDir();
    current = path.join(dir, 'atual');
    target = path.join(dir, 'nova');
    libraryDir = current;
    progress = [];
    settings = {
      getLibraryDir: () => libraryDir,
      setLibraryDir: jest.fn((next: string) => {
        libraryDir = next;
      }),
    };

    write(current, 'ola.md', '# Olá');
    write(current, 'books/livro.json', '{"id":1}');
  });

  afterEach(() => removeDir(dir));

  describe('inspect', () => {
    it('when the folder does not exist, should answer it is empty and missing', async () => {
      await expect(create().inspect(target)).resolves.toEqual({
        path: target,
        exists: false,
        empty: true,
        fileCount: 0,
      });
    });

    it('when the folder has files, should answer not empty with the file count', async () => {
      await expect(create().inspect(current)).resolves.toEqual({
        path: current,
        exists: true,
        empty: false,
        fileCount: 2,
      });
    });

    it('when the folder exists but is empty, should answer empty', async () => {
      fs.mkdirSync(target);

      await expect(create().inspect(target)).resolves.toMatchObject({ exists: true, empty: true });
    });

    it('when the path is relative, should reject with VALIDATION', async () => {
      await expect(create().inspect('relativa')).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });

  describe('apply in "move" mode', () => {
    it('when the destination is empty, should copy pages and books, switch the folder and require restart', async () => {
      const result = await create().apply({ to: target, mode: 'move' });

      expect(fs.readFileSync(path.join(target, 'ola.md'), 'utf8')).toBe('# Olá');
      expect(fs.readFileSync(path.join(target, 'books', 'livro.json'), 'utf8')).toBe('{"id":1}');
      expect(settings.setLibraryDir).toHaveBeenCalledWith(target);
      expect(result).toMatchObject({
        libraryDir: target,
        filesCopied: 2,
        originRemoved: false,
        restartRequired: true,
      });
    });

    it('when moving, should keep the old folder untouched unless asked to delete it', async () => {
      await create().apply({ to: target, mode: 'move' });

      expect(fs.existsSync(path.join(current, 'ola.md'))).toBe(true);
    });

    it('when asked to delete the origin, should remove the old folder only after the copy', async () => {
      const result = await create().apply({ to: target, mode: 'move', deleteOrigin: true });

      expect(fs.existsSync(current)).toBe(false);
      expect(fs.existsSync(path.join(target, 'ola.md'))).toBe(true);
      expect(result.originRemoved).toBe(true);
    });

    it('when moving, should report progress events for the copy', async () => {
      await create().apply({ to: target, mode: 'move' });

      expect(progress.map((event) => event.phase)).toEqual([
        'preparing',
        'running',
        'running',
        'verifying',
        'done',
      ]);
    });

    it('when the destination is not empty, should reject with VALIDATION and change nothing', async () => {
      write(target, 'outro.md', 'x');

      await expect(create().apply({ to: target, mode: 'move' })).rejects.toMatchObject({
        code: 'VALIDATION',
        message: expect.stringContaining('vazia'),
      });
      expect(settings.setLibraryDir).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(target, 'ola.md'))).toBe(false);
    });

    it('when the destination is the current folder, should reject saying it is already the library', async () => {
      await expect(create().apply({ to: current, mode: 'move' })).rejects.toMatchObject({
        code: 'VALIDATION',
        message: expect.stringContaining('já é a pasta'),
      });
    });

    it('when the destination is inside the current folder (or the opposite), should reject', async () => {
      await expect(
        create().apply({ to: path.join(current, 'dentro'), mode: 'move' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await expect(create().apply({ to: dir, mode: 'move' })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
      expect(settings.setLibraryDir).not.toHaveBeenCalled();
    });

    it('when the destination is relative, should reject with VALIDATION', async () => {
      await expect(create().apply({ to: 'relativa', mode: 'move' })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });

    it('when the copy fails, should reject with PERSIST_FAILED, keep the current folder and not switch', async () => {
      const copyFile = jest
        .spyOn(fs.promises, 'copyFile')
        .mockRejectedValueOnce(new Error('disco cheio'));

      try {
        await expect(
          create().apply({ to: target, mode: 'move', deleteOrigin: true }),
        ).rejects.toMatchObject({
          code: 'PERSIST_FAILED',
        });
      } finally {
        copyFile.mockRestore();
      }

      expect(settings.setLibraryDir).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(current, 'ola.md'))).toBe(true);
      expect(fs.existsSync(target)).toBe(false);
    });

    it('when deleting the old folder fails, should still finish the move and report why', async () => {
      const rm = jest.spyOn(fs.promises, 'rm').mockRejectedValueOnce(new Error('arquivo em uso'));

      try {
        const result = await create().apply({ to: target, mode: 'move', deleteOrigin: true });

        expect(settings.setLibraryDir).toHaveBeenCalledWith(target);
        expect(result.originRemoved).toBe(false);
        expect(result.originRemoveError).toContain('arquivo em uso');
      } finally {
        rm.mockRestore();
      }
    });

    it('when the current library does not exist yet, should just create the new empty folder and switch', async () => {
      libraryDir = path.join(dir, 'nunca-existiu');

      const result = await create().apply({ to: target, mode: 'move' });

      expect(result.filesCopied).toBe(0);
      expect(settings.setLibraryDir).toHaveBeenCalledWith(target);
    });
  });

  describe('apply in "use" mode', () => {
    it('when the folder already has a library, should switch to it without copying or touching either folder', async () => {
      write(target, 'existente.md', 'já estava aqui');

      const result = await create().apply({ to: target, mode: 'use' });

      expect(settings.setLibraryDir).toHaveBeenCalledWith(target);
      expect(result).toMatchObject({ filesCopied: 0, restartRequired: true });
      expect(fs.readdirSync(target)).toEqual(['existente.md']);
      expect(fs.existsSync(path.join(current, 'ola.md'))).toBe(true);
    });

    it('when the folder is the current one, should reject saying it is already the library', async () => {
      await expect(create().apply({ to: current, mode: 'use' })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });

    it('when "delete origin" is sent in use mode, should ignore it and keep the old folder', async () => {
      await create().apply({ to: target, mode: 'use', deleteOrigin: true });

      expect(fs.existsSync(path.join(current, 'ola.md'))).toBe(true);
    });
  });
});
