import * as fs from 'node:fs';
import * as path from 'node:path';

import { createAppPaths } from '../settings/app-paths';
import { makeTempDir, removeDir } from '../settings/settings.testing';

import { LegacyMigration, type MigrationChoice, type MigrationPlan } from './legacy-migration';

function write(root: string, relative: string, content: string): void {
  const target = path.join(root, ...relative.split('/'));

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

describe('LegacyMigration', () => {
  let dir: string;
  let userData: string;
  let root: string;
  let oldLibrary: string;
  let oldInbox: string;
  let confirm: jest.Mock<Promise<MigrationChoice>, [MigrationPlan]>;

  const appPaths = () => createAppPaths(root);

  const run = () =>
    new LegacyMigration({ userDataDir: userData, appPaths: appPaths(), confirm }).run();

  const writeLegacySettings = (extra: object = {}) =>
    write(
      userData,
      'settings.json',
      JSON.stringify({
        paths: {
          libraryDir: oldLibrary,
          inboxDir: oldInbox,
          videoTempDir: path.join(dir, 'velho', 'video'),
        },
        appearance: { theme: 'dark', accent: 'rose' },
        local: {
          whisper: { directory: 'D:/velho/whisper' },
          ollama: { url: 'http://outro:11434' },
        },
        ...extra,
      }),
    );

  beforeEach(() => {
    dir = makeTempDir();
    userData = path.join(dir, 'userData');
    root = path.join(dir, 'Documentos', 'HomeLab');
    oldLibrary = path.join(dir, 'velho', 'lib');
    oldInbox = path.join(dir, 'velho', 'docs');
    confirm = jest.fn().mockResolvedValue('move');

    fs.mkdirSync(userData, { recursive: true });
  });

  afterEach(() => removeDir(dir));

  it('when there is no old settings file, should do nothing and never ask', async () => {
    await expect(run()).resolves.toEqual({ status: 'none' });

    expect(confirm).not.toHaveBeenCalled();
    expect(fs.existsSync(appPaths().settingsFile)).toBe(false);
  });

  it('when the old settings file is unreadable, should do nothing instead of failing the start', async () => {
    write(userData, 'settings.json', '{ quebrado');

    await expect(run()).resolves.toEqual({ status: 'none' });
    expect(confirm).not.toHaveBeenCalled();
  });

  describe('with data to carry', () => {
    beforeEach(() => {
      write(oldLibrary, 'ola.md', '# Olá');
      write(oldLibrary, 'books/livro.json', '{"id":1}');
      write(oldInbox, 'pendente.md', 'rascunho');
      write(userData, 'ai-usage.json', '{"records":[]}');
      writeLegacySettings();
    });

    it('when asking, should describe what exists: old library, old inbox, usage history and where the library would go', async () => {
      await run();

      expect(confirm).toHaveBeenCalledWith({
        libraryDir: oldLibrary,
        inboxDir: oldInbox,
        hasUsage: true,
        newLibraryDir: appPaths().defaultLibraryDir,
        newRootDir: root,
      });
    });

    it('when the user chooses to move, should copy library and inbox to the new root and point the settings to the new library', async () => {
      await expect(run()).resolves.toEqual({ status: 'done', choice: 'move', warnings: [] });

      expect(fs.readFileSync(path.join(appPaths().defaultLibraryDir, 'ola.md'), 'utf8')).toBe(
        '# Olá',
      );
      expect(
        fs.readFileSync(path.join(appPaths().defaultLibraryDir, 'books', 'livro.json'), 'utf8'),
      ).toBe('{"id":1}');
      expect(fs.readFileSync(path.join(appPaths().inboxDir, 'pendente.md'), 'utf8')).toBe(
        'rascunho',
      );
      expect(fs.readFileSync(appPaths().usageFile, 'utf8')).toBe('{"records":[]}');
      expect(readJson(appPaths().settingsFile)).toEqual({
        paths: { libraryDir: appPaths().defaultLibraryDir },
        appearance: { theme: 'dark', accent: 'rose' },
        local: { ollama: { url: 'http://outro:11434' } },
      });
    });

    it('when migrating, should never delete the old folders and should mark the old files as migrated', async () => {
      await run();

      expect(fs.existsSync(path.join(oldLibrary, 'ola.md'))).toBe(true);
      expect(fs.existsSync(path.join(oldInbox, 'pendente.md'))).toBe(true);
      expect(fs.existsSync(path.join(userData, 'settings.json'))).toBe(false);
      expect(fs.existsSync(path.join(userData, 'settings.json.migrated'))).toBe(true);
      expect(fs.existsSync(path.join(userData, 'ai-usage.json'))).toBe(false);
      expect(fs.existsSync(path.join(userData, 'ai-usage.json.migrated'))).toBe(true);
    });

    it('when the migration is done, should not ask again on the next start', async () => {
      await run();
      confirm.mockClear();

      await expect(run()).resolves.toEqual({ status: 'none' });
      expect(confirm).not.toHaveBeenCalled();
    });

    it('when the user chooses to keep the library in place, should copy only inbox and usage and keep the old library path', async () => {
      confirm.mockResolvedValue('keep');

      await expect(run()).resolves.toEqual({ status: 'done', choice: 'keep', warnings: [] });

      expect(fs.existsSync(appPaths().defaultLibraryDir)).toBe(false);
      expect(fs.existsSync(path.join(appPaths().inboxDir, 'pendente.md'))).toBe(true);
      expect(readJson(appPaths().settingsFile).paths).toEqual({ libraryDir: oldLibrary });
    });

    it('when the user chooses "later", should open with the old library path, copy nothing and ask again next time', async () => {
      confirm.mockResolvedValue('later');

      await expect(run()).resolves.toEqual({ status: 'later' });

      expect(readJson(appPaths().settingsFile).paths).toEqual({ libraryDir: oldLibrary });
      expect(fs.existsSync(appPaths().inboxDir)).toBe(false);
      expect(fs.existsSync(path.join(userData, 'settings.json'))).toBe(true);

      confirm.mockClear();
      await run();

      expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('when the user answered "later" before, should not overwrite settings saved in the meantime', async () => {
      confirm.mockResolvedValue('later');
      await run();
      write(root, 'config/settings.json', JSON.stringify({ appearance: { theme: 'light' } }));

      await run();

      expect(readJson(appPaths().settingsFile)).toEqual({ appearance: { theme: 'light' } });
    });

    it('when the new library folder already has files, should keep the old library in use and warn', async () => {
      write(appPaths().defaultLibraryDir, 'ja-existia.md', 'x');

      const outcome = await run();

      expect(outcome).toMatchObject({ status: 'done', choice: 'move' });
      expect((outcome as { warnings: string[] }).warnings).toHaveLength(1);
      expect(readJson(appPaths().settingsFile).paths).toEqual({ libraryDir: oldLibrary });
      expect(fs.readdirSync(appPaths().defaultLibraryDir)).toEqual(['ja-existia.md']);
    });

    it('when the new inbox already has files, should not copy the old inbox and warn', async () => {
      write(appPaths().inboxDir, 'ja-existia.md', 'x');

      const outcome = await run();

      expect((outcome as { warnings: string[] }).warnings).toHaveLength(1);
      expect(fs.readdirSync(appPaths().inboxDir)).toEqual(['ja-existia.md']);
    });

    it('when copying fails, should undo the copies, keep the old library in the settings, leave the old files untouched and ask again next time', async () => {
      const copyFile = jest.spyOn(fs.promises, 'copyFile');

      // a biblioteca copia (2 arquivos); a entrada falha
      let calls = 0;
      copyFile.mockImplementation(async (from, to, mode) => {
        calls += 1;

        if (calls > 2) {
          throw new Error('disco cheio');
        }

        const actual = jest.requireActual<typeof import('node:fs')>('node:fs');

        return actual.promises.copyFile(from, to, mode);
      });

      try {
        const outcome = await run();

        expect(outcome).toMatchObject({ status: 'failed' });
        expect((outcome as { error: string }).error).toContain('disco cheio');
        expect((outcome as { error: string }).error).toContain('intactos');
      } finally {
        copyFile.mockRestore();
      }

      expect(fs.existsSync(appPaths().defaultLibraryDir)).toBe(false);
      expect(fs.existsSync(appPaths().inboxDir)).toBe(false);
      expect(readJson(appPaths().settingsFile).paths).toEqual({ libraryDir: oldLibrary });
      expect(fs.existsSync(path.join(oldLibrary, 'ola.md'))).toBe(true);
      expect(fs.existsSync(path.join(userData, 'settings.json'))).toBe(true);
    });
  });

  describe('without data to carry', () => {
    it('when there is only settings (no library, inbox or usage), should migrate silently without asking', async () => {
      writeLegacySettings();

      await expect(run()).resolves.toEqual({ status: 'done', choice: 'keep', warnings: [] });

      expect(confirm).not.toHaveBeenCalled();
      expect(readJson(appPaths().settingsFile).appearance).toEqual({
        theme: 'dark',
        accent: 'rose',
      });
      expect(fs.existsSync(path.join(userData, 'settings.json.migrated'))).toBe(true);
    });

    it('when the old folders exist but are empty, should not count them as data', async () => {
      fs.mkdirSync(oldLibrary, { recursive: true });
      fs.mkdirSync(oldInbox, { recursive: true });
      writeLegacySettings();

      await run();

      expect(confirm).not.toHaveBeenCalled();
    });
  });

  it('when the old inbox is already the new inbox, should not copy it onto itself', async () => {
    write(appPaths().inboxDir, 'pendente.md', 'rascunho');
    writeLegacySettings({ paths: { libraryDir: oldLibrary, inboxDir: appPaths().inboxDir } });

    const outcome = await run();

    expect(outcome).toEqual({ status: 'done', choice: 'move', warnings: [] });
    expect(fs.readFileSync(path.join(appPaths().inboxDir, 'pendente.md'), 'utf8')).toBe('rascunho');
  });
});
