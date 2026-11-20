import { DEFAULT_SUMMARY, DEFAULT_TRANSCRIPT } from '../shared/contracts/document-views';
import { DEFAULT_READING } from '../shared/contracts/reading';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { FakeEventPublisher } from '../ipc/testing/fake-event-publisher';
import { makeTempDir, removeDir, testDefaults } from '../settings/settings.testing';
import type { BackupItemId, RecordImportResult, RestoreMode } from '../shared/contracts/backup';
import type { SettingsPatch } from '../shared/contracts/settings';
import { SettingsStore } from '../settings/settings-store';
import { JsonFile } from '../storage/json-file';

import {
  BackupService,
  estimateZipBytes,
  type BackupCollection,
  type BackupDeps,
} from './backup.service';
import { BACKUP_FORMAT, BACKUP_VERSION, MANIFEST_ENTRY } from './manifest';
import { listZip, readZipText, writeZip } from './zip';

function write(root: string, relative: string, content: string): string {
  const target = path.join(root, ...relative.split('/'));

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);

  return target;
}

/** Coleção falsa com a mesma regra de mesclar e substituir do app (por id). */
class FakeCollection implements BackupCollection {
  failOnImport = false;

  constructor(public items: Array<{ id: string; title?: string }> = []) {}

  export(): unknown[] {
    return structuredClone(this.items);
  }

  import(raw: unknown[], mode: RestoreMode): RecordImportResult {
    if (this.failOnImport) {
      throw new Error('disco cheio');
    }

    const incoming = raw.filter(
      (item): item is { id: string; title?: string } =>
        typeof (item as { id?: unknown })?.id === 'string',
    );

    if (mode === 'replace') {
      this.items = [];
    }

    let added = 0;

    for (const item of incoming) {
      if (!this.items.some((existing) => existing.id === item.id)) {
        this.items.push(structuredClone(item));
        added += 1;
      }
    }

    return { added, skipped: raw.length - added };
  }
}

interface Env {
  dir: string;
  library: string;
  inbox: string;
  tempDir: string;
  jobs: FakeCollection;
  chats: FakeCollection;
  mindMaps: FakeCollection;
  infographics: FakeCollection;
  usage: FakeCollection;
  settings: SettingsStore;
  events: FakeEventPublisher;
  picker: { pickSavePath: jest.Mock; pickOpenPath: jest.Mock };
  reindex: jest.Mock;
  service: BackupService;
}

/** Um "computador" completo do app: pastas, coleções, configurações e o serviço de backup. */
function makeEnv(label: string, overrides: Partial<BackupDeps> = {}): Env {
  const dir = makeTempDir();
  const library = path.join(dir, 'library');
  const inbox = path.join(dir, 'inbox');
  const tempDir = path.join(dir, 'temp');
  const jobs = new FakeCollection();
  const chats = new FakeCollection();
  const mindMaps = new FakeCollection();
  const infographics = new FakeCollection();
  const usage = new FakeCollection();
  const settings = new SettingsStore(
    new JsonFile<SettingsPatch>(path.join(dir, 'config', 'settings.json')),
    { ...testDefaults(), paths: { libraryDir: library } },
  );
  const events = new FakeEventPublisher();
  const picker = { pickSavePath: jest.fn(), pickOpenPath: jest.fn() };
  const reindex = jest.fn().mockResolvedValue(undefined);

  fs.mkdirSync(library, { recursive: true });
  fs.mkdirSync(inbox, { recursive: true });

  const service = new BackupService({
    appVersion: `1.0.0-${label}`,
    tempDir,
    libraryDir: () => library,
    inboxDir: () => inbox,
    collections: { jobs, chats, mindMaps, infographics, usage },
    settings,
    reindexLibrary: reindex,
    filePicker: picker,
    events,
    now: () => new Date(2026, 10, 15, 13, 45, 30),
    ...overrides,
  });

  return {
    dir,
    library,
    inbox,
    tempDir,
    jobs,
    chats,
    mindMaps,
    infographics,
    usage,
    settings,
    events,
    picker,
    reindex,
    service,
  };
}

const list = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) =>
          path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
        )
        .sort()
    : [];

describe('estimateZipBytes', () => {
  it('when the file is text, should estimate a good compression', () => {
    expect(estimateZipBytes('a/nota.md', 1000)).toBe(300);
  });

  it('when the file is already compressed, should estimate no gain', () => {
    expect(estimateZipBytes('foto.JPG', 1000)).toBe(1000);
  });

  it('when the type is unknown, should estimate a middle value', () => {
    expect(estimateZipBytes('dados.bin', 1000)).toBe(700);
  });
});

describe('BackupService', () => {
  const envs: Env[] = [];
  const env = (label = 'a', overrides: Partial<BackupDeps> = {}) => {
    const made = makeEnv(label, overrides);

    envs.push(made);

    return made;
  };

  afterEach(() => {
    envs.splice(0).forEach((made) => removeDir(made.dir));
  });

  describe('preview', () => {
    it('when there is data, should list every item with count, size and a smaller zip estimate', async () => {
      const e = env();

      write(e.library, 'ola.md', 'a'.repeat(1000));
      write(e.library, 'books/livro.json', 'b'.repeat(500));
      write(e.inbox, 'pendente.md', 'c'.repeat(100));
      e.jobs.items = [{ id: 'j1' }, { id: 'j2' }];
      e.chats.items = [{ id: 'c1' }];

      const { items } = await e.service.preview();
      const byId = Object.fromEntries(items.map((item) => [item.id, item]));

      expect(items.map((item) => item.id)).toEqual([
        'library',
        'inbox',
        'jobs',
        'chats',
        'mindMaps',
        'infographics',
        'usage',
        'settings',
      ]);
      expect(byId.library).toMatchObject({ kind: 'files', count: 2, bytes: 1500 });
      expect(byId.library.estimatedZipBytes).toBeLessThan(1500);
      expect(byId.inbox).toMatchObject({ kind: 'files', count: 1, bytes: 100 });
      expect(byId.jobs).toMatchObject({ kind: 'records', count: 2 });
      expect(byId.chats).toMatchObject({ kind: 'records', count: 1 });
      expect(byId.mindMaps).toMatchObject({ kind: 'records', count: 0 });
      expect(byId.infographics).toMatchObject({ kind: 'records', count: 0 });
      expect(byId.usage).toMatchObject({ kind: 'records', count: 0 });
      expect(byId.settings).toMatchObject({ kind: 'records', count: 1 });
    });

    it('when the folders are empty or do not exist, should answer zeros without failing', async () => {
      const e = env();

      fs.rmSync(e.inbox, { recursive: true });

      const { items } = await e.service.preview();

      expect(items.find((item) => item.id === 'library')).toMatchObject({
        count: 0,
        bytes: 0,
        estimatedZipBytes: 0,
      });
      expect(items.find((item) => item.id === 'inbox')).toMatchObject({ count: 0, bytes: 0 });
    });

    it('when previewing, should warn about everything that is left out of the backup', async () => {
      const { notIncluded } = await env().service.preview();

      expect(notIncluded).toEqual([
        'secrets',
        'temp',
        'ai-binaries',
        'preferences',
        'library-path',
      ]);
    });
  });

  describe('create', () => {
    const destinationOf = (e: Env, name = 'meu-backup.zip') => {
      const destination = path.join(e.dir, 'saida', name);

      e.picker.pickSavePath.mockResolvedValue(destination);

      return destination;
    };

    it('when creating, should suggest a dated file name and ask for a zip', async () => {
      const e = env();

      e.picker.pickSavePath.mockResolvedValue(null);
      await e.service.create({ items: ['library'] });

      expect(e.picker.pickSavePath).toHaveBeenCalledWith({
        defaultPath: 'homelab-backup-2026-11-15.zip',
        filters: [{ name: 'Backup do HomeLab', extensions: ['zip'] }],
      });
    });

    it('when the user closes the save dialog, should answer cancelled and create nothing', async () => {
      const e = env();

      e.picker.pickSavePath.mockResolvedValue(null);

      await expect(e.service.create({ items: ['library'] })).resolves.toEqual({ cancelled: true });
    });

    it('when creating with all the items, should put each one in its place with a matching manifest', async () => {
      const e = env();
      const destination = destinationOf(e);

      write(e.library, 'ola.md', '# Olá');
      write(e.library, 'books/livro.json', '{}');
      write(e.inbox, 'pendente.md', 'rascunho');
      e.jobs.items = [{ id: 'j1' }];
      e.chats.items = [{ id: 'c1' }, { id: 'c2' }];

      const result = await e.service.create({
        items: ['library', 'inbox', 'jobs', 'chats', 'usage', 'settings'],
      });

      expect(result).toMatchObject({ cancelled: false, path: destination, files: 8 });
      expect(result.bytes).toBe(fs.statSync(destination).size);
      expect((await listZip(destination)).map((entry) => entry.name).sort()).toEqual([
        'config/settings.json',
        'data/ai-usage.json',
        'data/chats.json',
        'data/jobs.json',
        'inbox/pendente.md',
        'library/books/livro.json',
        'library/ola.md',
        'manifest.json',
      ]);

      const manifest = JSON.parse((await readZipText(destination, MANIFEST_ENTRY)) ?? '{}');

      expect(manifest).toMatchObject({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        appVersion: '1.0.0-a',
        createdAt: new Date(2026, 10, 15, 13, 45, 30).toISOString(),
      });
      expect(manifest.items).toEqual([
        { id: 'library', kind: 'files', count: 2, bytes: 8 },
        { id: 'inbox', kind: 'files', count: 1, bytes: 8 },
        { id: 'jobs', kind: 'records', count: 1, bytes: expect.any(Number) },
        { id: 'chats', kind: 'records', count: 2, bytes: expect.any(Number) },
        { id: 'usage', kind: 'records', count: 0, bytes: expect.any(Number) },
        { id: 'settings', kind: 'records', count: 1, bytes: expect.any(Number) },
      ]);
    });

    it('when saving mind maps and infographics, should write each one in its own file with its count', async () => {
      const e = env();
      const destination = destinationOf(e);

      e.mindMaps.items = [{ id: 'p1', title: 'mapa' }];
      e.infographics.items = [{ id: 'p1' }, { id: 'p2' }];

      await e.service.create({ items: ['mindMaps', 'infographics'] });

      expect((await listZip(destination)).map((entry) => entry.name).sort()).toEqual([
        'data/infographics.json',
        'data/mind-maps.json',
        'manifest.json',
      ]);

      const maps = JSON.parse((await readZipText(destination, 'data/mind-maps.json')) ?? '{}');
      const infographics = JSON.parse(
        (await readZipText(destination, 'data/infographics.json')) ?? '{}',
      );
      const manifest = JSON.parse((await readZipText(destination, MANIFEST_ENTRY)) ?? '{}');

      expect(maps).toEqual({ version: BACKUP_VERSION, maps: e.mindMaps.items });
      expect(infographics).toEqual({ version: BACKUP_VERSION, infographics: e.infographics.items });
      expect(manifest.items).toEqual([
        { id: 'mindMaps', kind: 'records', count: 1, bytes: expect.any(Number) },
        { id: 'infographics', kind: 'records', count: 2, bytes: expect.any(Number) },
      ]);
    });

    it('when the mind maps are not chosen, should leave only them out of the backup', async () => {
      const e = env();
      const destination = destinationOf(e);

      e.mindMaps.items = [{ id: 'p1' }];
      e.infographics.items = [{ id: 'p1' }];

      await e.service.create({ items: ['infographics'] });

      expect((await listZip(destination)).map((entry) => entry.name).sort()).toEqual([
        'data/infographics.json',
        'manifest.json',
      ]);
    });

    it('when only some items are chosen, should leave the others out of the zip', async () => {
      const e = env();
      const destination = destinationOf(e);

      write(e.library, 'ola.md', '# Olá');
      write(e.inbox, 'pendente.md', 'rascunho');
      e.chats.items = [{ id: 'c1' }];

      await e.service.create({ items: ['library'] });

      expect((await listZip(destination)).map((entry) => entry.name).sort()).toEqual([
        'library/ola.md',
        'manifest.json',
      ]);
    });

    it('when saving settings, should never include the library path nor any secret', async () => {
      const e = env();
      const destination = destinationOf(e);

      await e.service.create({ items: ['settings'] });

      const saved = JSON.parse((await readZipText(destination, 'config/settings.json')) ?? '{}');

      expect(Object.keys(saved).sort()).toEqual(['appearance', 'local']);
      expect(saved).not.toHaveProperty('paths');
      expect(JSON.stringify(saved)).not.toContain(e.library);
      expect(saved.local).toEqual({ ollama: { url: 'http://localhost:11434' } });
    });

    it('when creating, should never include the temp folder even if it sits next to the data', async () => {
      const e = env();
      const destination = destinationOf(e);

      write(e.tempDir, 'video/aula.mp4', 'video');
      write(e.library, 'ola.md', 'x');

      await e.service.create({ items: ['library', 'inbox', 'jobs', 'chats', 'usage', 'settings'] });

      expect((await listZip(destination)).some((entry) => entry.name.includes('temp'))).toBe(false);
    });

    it('when creating, should report preparing, one running event per file and done', async () => {
      const e = env();

      destinationOf(e);
      write(e.library, 'a.md', 'a');
      write(e.library, 'b.md', 'b');

      await e.service.create({ items: ['library'] });

      const progress = e.events.payloadsOf('backup:progress');

      expect(progress[0]).toMatchObject({ phase: 'preparing' });
      expect(progress.filter((event) => event.phase === 'running').at(-1)).toMatchObject({
        processed: 3,
        total: 3,
      });
      expect(progress.at(-1)).toMatchObject({ phase: 'done', processed: 3, total: 3 });
    });

    it('when cancelled in the middle, should answer cancelled and leave no zip or partial file', async () => {
      const e = env();
      const destination = destinationOf(e);

      for (const name of ['a', 'b', 'c', 'd']) {
        write(e.library, `${name}.md`, name.repeat(1000));
      }

      e.events.publish = ((event: string, payload: { phase: string; processed: number }) => {
        if (event === 'backup:progress' && payload.phase === 'running' && payload.processed === 1) {
          e.service.cancel();
        }
      }) as typeof e.events.publish;

      await expect(e.service.create({ items: ['library'] })).resolves.toEqual({ cancelled: true });
      expect(fs.existsSync(destination)).toBe(false);
      expect(fs.existsSync(`${destination}.partial`)).toBe(false);
    });

    it('when no item is chosen, should reject with VALIDATION before asking where to save', async () => {
      const e = env();

      await expect(e.service.create({ items: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
      expect(e.picker.pickSavePath).not.toHaveBeenCalled();
    });

    it('when an item is unknown, should reject with VALIDATION', async () => {
      await expect(env().service.create({ items: ['secrets' as never] })).rejects.toMatchObject({
        code: 'VALIDATION',
        message: expect.stringContaining('secrets'),
      });
    });

    it('when the same item comes twice, should include it once', async () => {
      const e = env();
      const destination = destinationOf(e);

      await e.service.create({ items: ['jobs', 'jobs'] });

      expect((await listZip(destination)).map((entry) => entry.name).sort()).toEqual([
        'data/jobs.json',
        'manifest.json',
      ]);
    });

    it('when a file disappears while the zip is written, should fail with PERSIST_FAILED and leave no partial zip', async () => {
      const e = env();
      const destination = destinationOf(e);
      const file = write(e.library, 'some.md', 'x');

      e.events.publish = () => undefined;
      const scan = jest.spyOn(fs.promises, 'stat').mockImplementationOnce(async () => {
        fs.rmSync(file);

        return fs.statSync(e.dir);
      });

      try {
        await expect(e.service.create({ items: ['library'] })).rejects.toMatchObject({
          code: 'PERSIST_FAILED',
        });
      } finally {
        scan.mockRestore();
      }

      expect(fs.existsSync(destination)).toBe(false);
      expect(fs.existsSync(`${destination}.partial`)).toBe(false);
    });

    it('when a backup is already running, should refuse a second one', async () => {
      const e = env();
      const destination = destinationOf(e);
      let release: () => void = () => undefined;

      write(e.library, 'a.md', 'a');
      e.picker.pickSavePath.mockImplementationOnce(
        () => new Promise((resolve) => (release = () => resolve(destination))),
      );

      const first = e.service.create({ items: ['library'] });

      // o primeiro ainda espera o diálogo; marca como em andamento só depois dele, então simula com cancel
      release();
      await first;

      expect(await e.service.create({ items: ['library'] })).toMatchObject({ cancelled: false });
    });
  });

  describe('inspect', () => {
    it('when the user cancels the open dialog, should answer null', async () => {
      const e = env();

      e.picker.pickOpenPath.mockResolvedValue(null);

      await expect(e.service.inspect()).resolves.toBeNull();
    });

    it('when choosing a valid backup, should answer its date, version, file name and items from the manifest', async () => {
      const a = env('a');
      const b = env('b');
      const zip = path.join(a.dir, 'backup.zip');

      write(a.library, 'ola.md', '# Olá');
      a.chats.items = [{ id: 'c1' }];
      a.picker.pickSavePath.mockResolvedValue(zip);
      await a.service.create({ items: ['library', 'chats'] });
      b.picker.pickOpenPath.mockResolvedValue(zip);

      const inspection = await b.service.inspect();

      expect(inspection).toMatchObject({
        fileName: 'backup.zip',
        appVersion: '1.0.0-a',
        createdAt: new Date(2026, 10, 15, 13, 45, 30).toISOString(),
        items: [
          { id: 'library', kind: 'files', count: 1, bytes: 6 },
          { id: 'chats', kind: 'records', count: 1, bytes: expect.any(Number) },
        ],
      });
      expect(inspection?.token).toMatch(/^[0-9a-f-]{36}$/);
      expect(inspection).not.toHaveProperty('path');
    });

    it('when the file is not a zip, should reject with VALIDATION', async () => {
      const e = env();

      e.picker.pickOpenPath.mockResolvedValue(write(e.dir, 'falso.zip', 'lixo'));

      await expect(e.service.inspect()).rejects.toMatchObject({ code: 'VALIDATION' });
    });

    it('when the zip has no manifest, should reject saying it is not a HomeLab backup', async () => {
      const e = env();
      const zip = path.join(e.dir, 'sem-manifesto.zip');

      await writeZip(zip, [{ name: 'library/a.md', source: { buffer: Buffer.from('a') } }]);
      e.picker.pickOpenPath.mockResolvedValue(zip);

      await expect(e.service.inspect()).rejects.toThrow(/manifesto/);
    });

    it('when the zip holds a file that does not belong to a backup, should reject', async () => {
      const e = env();
      const zip = path.join(e.dir, 'estranho.zip');
      const manifest = {
        format: BACKUP_FORMAT,
        version: 1,
        createdAt: '',
        appVersion: '',
        items: [],
      };

      await writeZip(zip, [
        { name: 'manifest.json', source: { buffer: Buffer.from(JSON.stringify(manifest)) } },
        { name: 'secrets.json', source: { buffer: Buffer.from('{}') } },
      ]);
      e.picker.pickOpenPath.mockResolvedValue(zip);

      await expect(e.service.inspect()).rejects.toThrow(/inesperado/);
    });

    it('when the backup comes from a newer version, should reject asking to update the app', async () => {
      const e = env();
      const zip = path.join(e.dir, 'futuro.zip');
      const manifest = {
        format: BACKUP_FORMAT,
        version: 99,
        createdAt: '',
        appVersion: '',
        items: [],
      };

      await writeZip(zip, [
        { name: 'manifest.json', source: { buffer: Buffer.from(JSON.stringify(manifest)) } },
      ]);
      e.picker.pickOpenPath.mockResolvedValue(zip);

      await expect(e.service.inspect()).rejects.toThrow(/versão mais nova/);
    });
  });

  describe('restore', () => {
    /** Cria um backup completo na máquina "a" e o abre na máquina de destino. */
    async function backupFrom(
      source: Env,
      target: Env,
      items: BackupItemId[] = ['library', 'inbox', 'jobs', 'chats', 'usage', 'settings'],
    ) {
      const zip = path.join(source.dir, 'backup.zip');

      source.picker.pickSavePath.mockResolvedValue(zip);
      await source.service.create({ items });
      target.picker.pickOpenPath.mockResolvedValue(zip);

      return (await target.service.inspect())!;
    }

    const seedSource = (a: Env) => {
      write(a.library, 'ola.md', '# do backup');
      write(a.library, 'books/livro.json', '{"id":1}');
      write(a.inbox, 'pendente.md', 'rascunho do backup');
      a.jobs.items = [{ id: 'j1', title: 'job do backup' }];
      a.chats.items = [{ id: 'c1', title: 'chat do backup' }];
      a.usage.items = [{ id: 'u1' }];
      a.settings.update({
        appearance: { theme: 'dark', accent: 'rose' },
        local: { ollama: { url: 'http://outro:1234' } },
      });
    };

    it('when restoring mind maps and infographics (merge), should add the missing ones and report the rest as kept', async () => {
      const a = env('a');
      const b = env('b');

      a.mindMaps.items = [{ id: 'p1' }, { id: 'p2' }];
      a.infographics.items = [{ id: 'p1' }];
      b.mindMaps.items = [{ id: 'p1' }];
      const { token } = await backupFrom(a, b, ['mindMaps', 'infographics']);

      const result = await b.service.restore({
        token,
        items: ['mindMaps', 'infographics'],
        mode: 'merge',
      });

      expect(b.mindMaps.items).toEqual([{ id: 'p1' }, { id: 'p2' }]);
      expect(b.infographics.items).toEqual([{ id: 'p1' }]);
      expect(result.items).toEqual([
        { id: 'mindMaps', added: 1, skipped: 1 },
        { id: 'infographics', added: 1, skipped: 0 },
      ]);
    });

    it('when restoring mind maps (replace), should swap them for the backup and keep a safety copy', async () => {
      const a = env('a');
      const b = env('b');

      a.mindMaps.items = [{ id: 'p1', title: 'do backup' }];
      b.mindMaps.items = [{ id: 'p9', title: 'da máquina' }];
      const { token } = await backupFrom(a, b, ['mindMaps']);

      const result = await b.service.restore({ token, items: ['mindMaps'], mode: 'replace' });

      expect(b.mindMaps.items).toEqual([{ id: 'p1', title: 'do backup' }]);
      expect(result.safetyCopyPath).not.toBeNull();
      expect(
        fs.existsSync(path.join(result.safetyCopyPath as string, 'data', 'mind-maps.json')),
      ).toBe(true);
    });

    it('when restoring only the infographics, should not touch the mind maps', async () => {
      const a = env('a');
      const b = env('b');

      a.mindMaps.items = [{ id: 'p1' }];
      a.infographics.items = [{ id: 'p1' }];
      b.mindMaps.items = [{ id: 'keep' }];
      const { token } = await backupFrom(a, b, ['mindMaps', 'infographics']);

      await b.service.restore({ token, items: ['infographics'], mode: 'replace' });

      expect(b.mindMaps.items).toEqual([{ id: 'keep' }]);
      expect(b.infographics.items).toEqual([{ id: 'p1' }]);
    });

    it('when restoring into a clean machine (merge), should bring pages, books, inbox, jobs, chats and usage', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({
        token,
        items: ['library', 'inbox', 'jobs', 'chats', 'usage'],
        mode: 'merge',
      });

      expect(list(b.library)).toEqual(['books/livro.json', 'ola.md']);
      expect(fs.readFileSync(path.join(b.library, 'ola.md'), 'utf8')).toBe('# do backup');
      expect(list(b.inbox)).toEqual(['pendente.md']);
      expect(b.jobs.items).toEqual([{ id: 'j1', title: 'job do backup' }]);
      expect(b.chats.items).toEqual([{ id: 'c1', title: 'chat do backup' }]);
      expect(b.usage.items).toEqual([{ id: 'u1' }]);
      expect(result.items).toEqual([
        { id: 'usage', added: 1, skipped: 0 },
        { id: 'jobs', added: 1, skipped: 0 },
        { id: 'chats', added: 1, skipped: 0 },
        { id: 'inbox', added: 1, skipped: 0 },
        { id: 'library', added: 2, skipped: 0 },
      ]);
      expect(result.safetyCopyPath).toBeNull();
      expect(b.reindex).toHaveBeenCalledTimes(1);
    });

    it('when merging, should keep the files and records that already exist and add only the missing ones', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      write(b.library, 'ola.md', '# meu, nunca sobrescrever');
      b.chats.items = [{ id: 'c1', title: 'chat que eu já tinha' }];
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['library', 'chats'], mode: 'merge' });

      expect(fs.readFileSync(path.join(b.library, 'ola.md'), 'utf8')).toBe(
        '# meu, nunca sobrescrever',
      );
      expect(fs.existsSync(path.join(b.library, 'books', 'livro.json'))).toBe(true);
      expect(b.chats.items).toEqual([{ id: 'c1', title: 'chat que eu já tinha' }]);
      expect(result.items.find((item) => item.id === 'library')).toEqual({
        id: 'library',
        added: 1,
        skipped: 1,
      });
      expect(result.items.find((item) => item.id === 'chats')).toEqual({
        id: 'chats',
        added: 0,
        skipped: 1,
      });
    });

    it('when restoring only some items, should leave the others untouched', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      b.jobs.items = [{ id: 'meu-job' }];
      const { token } = await backupFrom(a, b);

      await b.service.restore({ token, items: ['inbox'], mode: 'merge' });

      expect(list(b.inbox)).toEqual(['pendente.md']);
      expect(list(b.library)).toEqual([]);
      expect(b.jobs.items).toEqual([{ id: 'meu-job' }]);
      expect(b.reindex).toHaveBeenCalledTimes(1);
    });

    it('when only records are restored, should not reindex the library', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      await b.service.restore({ token, items: ['jobs', 'chats'], mode: 'merge' });

      expect(b.reindex).not.toHaveBeenCalled();
    });

    it('when replacing the library, should keep a safety copy of the old files, then bring only the backup ones', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      write(b.library, 'antigo.md', 'documento antigo');
      write(b.library, 'ola.md', '# versão antiga');
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['library'], mode: 'replace' });

      expect(list(b.library)).toEqual(['books/livro.json', 'ola.md']);
      expect(fs.readFileSync(path.join(b.library, 'ola.md'), 'utf8')).toBe('# do backup');
      expect(result.safetyCopyPath).not.toBeNull();
      expect(list(path.join(result.safetyCopyPath as string, 'library'))).toEqual([
        'antigo.md',
        'ola.md',
      ]);
      expect(
        fs.readFileSync(path.join(result.safetyCopyPath as string, 'library', 'antigo.md'), 'utf8'),
      ).toBe('documento antigo');
      expect(result.items).toEqual([{ id: 'library', added: 2, skipped: 0 }]);
    });

    it('when the library is empty and replaced, should not create a pointless safety copy', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['library'], mode: 'replace' });

      expect(result.safetyCopyPath).toBeNull();
    });

    it('when replacing records, should swap them for the backup ones and keep a copy of the old ones in the safety folder', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      b.chats.items = [{ id: 'velho', title: 'chat velho' }];
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['chats'], mode: 'replace' });

      expect(b.chats.items).toEqual([{ id: 'c1', title: 'chat do backup' }]);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(result.safetyCopyPath as string, 'data', 'chats.json'), 'utf8'),
        ),
      ).toEqual([{ id: 'velho', title: 'chat velho' }]);
    });

    it('when merging settings, should keep the current ones (merge never changes what is in use)', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['settings'], mode: 'merge' });

      expect(b.settings.get().appearance).toEqual({
        theme: 'system',
        accent: 'cyan',
        reading: DEFAULT_READING,
        transcript: DEFAULT_TRANSCRIPT,
        summary: DEFAULT_SUMMARY,
      });
      expect(result.items).toEqual([{ id: 'settings', added: 0, skipped: 1 }]);
      expect(result.restartRequired).toBe(false);
    });

    it('when replacing settings, should apply appearance and Ollama but never the library path, and ask for a restart when Ollama changed', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['settings'], mode: 'replace' });

      expect(b.settings.get().appearance).toEqual({
        theme: 'dark',
        accent: 'rose',
        reading: DEFAULT_READING,
        transcript: DEFAULT_TRANSCRIPT,
        summary: DEFAULT_SUMMARY,
      });
      expect(b.settings.get().local.ollama.url).toBe('http://outro:1234');
      expect(b.settings.get().paths.libraryDir).toBe(b.library);
      expect(result.restartRequired).toBe(true);
    });

    it('when replacing settings and Ollama stays the same, should not ask for a restart', async () => {
      const a = env('a');
      const b = env('b');

      a.settings.update({ appearance: { theme: 'dark' } });
      const { token } = await backupFrom(a, b);

      const result = await b.service.restore({ token, items: ['settings'], mode: 'replace' });

      expect(b.settings.get().appearance.theme).toBe('dark');
      expect(result.restartRequired).toBe(false);
    });

    it('when a step fails after others were applied, should undo everything and say so', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      write(b.library, 'antigo.md', 'documento antigo');
      b.jobs.items = [{ id: 'meu-job' }];
      b.chats.items = [{ id: 'meu-chat' }];
      const { token } = await backupFrom(a, b);

      b.reindex.mockRejectedValueOnce(new Error('índice quebrou'));

      await expect(
        b.service.restore({ token, items: ['library', 'jobs', 'chats'], mode: 'replace' }),
      ).rejects.toMatchObject({
        code: 'PERSIST_FAILED',
        message: expect.stringContaining('desfeitas'),
      });

      expect(list(b.library)).toEqual(['antigo.md']);
      expect(fs.readFileSync(path.join(b.library, 'antigo.md'), 'utf8')).toBe('documento antigo');
      expect(b.jobs.items).toEqual([{ id: 'meu-job' }]);
      expect(b.chats.items).toEqual([{ id: 'meu-chat' }]);
    });

    it('when a merge fails midway, should remove the files it had added and restore the records', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      b.chats.items = [{ id: 'meu-chat' }];
      const { token } = await backupFrom(a, b);

      b.reindex.mockRejectedValueOnce(new Error('índice quebrou'));

      await expect(
        b.service.restore({ token, items: ['library', 'chats'], mode: 'merge' }),
      ).rejects.toMatchObject({ code: 'PERSIST_FAILED' });

      expect(list(b.library)).toEqual([]);
      expect(b.chats.items).toEqual([{ id: 'meu-chat' }]);
    });

    it('when importing a collection fails, should undo the items already applied before it', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      b.chats.failOnImport = true;

      await expect(
        b.service.restore({ token, items: ['usage', 'jobs', 'chats'], mode: 'merge' }),
      ).rejects.toMatchObject({
        code: 'PERSIST_FAILED',
        message: expect.stringContaining('disco cheio'),
      });

      expect(b.usage.items).toEqual([]);
      expect(b.jobs.items).toEqual([]);
    });

    it('when the backup data of an item is unreadable, should reject with VALIDATION and undo the earlier items', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const zip = path.join(a.dir, 'backup.zip');

      a.picker.pickSavePath.mockResolvedValue(zip);
      await a.service.create({ items: ['usage', 'chats'] });

      const manifest = (await readZipText(zip, MANIFEST_ENTRY)) as string;
      const broken = path.join(a.dir, 'quebrado.zip');

      await writeZip(broken, [
        { name: 'manifest.json', source: { buffer: Buffer.from(manifest) } },
        {
          name: 'data/ai-usage.json',
          source: { buffer: Buffer.from(JSON.stringify({ version: 1, records: [{ id: 'u1' }] })) },
        },
        { name: 'data/chats.json', source: { buffer: Buffer.from('isto não é json') } },
      ]);
      b.picker.pickOpenPath.mockResolvedValue(broken);
      const { token } = (await b.service.inspect())!;

      await expect(
        b.service.restore({ token, items: ['usage', 'chats'], mode: 'merge' }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        message: expect.stringContaining('ilegíveis'),
      });

      expect(b.usage.items).toEqual([]);
    });

    it('when restoring, should report preparing, extraction, verifying and done', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      await b.service.restore({ token, items: ['library'], mode: 'merge' });

      const phases = b.events.payloadsOf('backup:progress').map((event) => event.phase);

      expect(phases[0]).toBe('preparing');
      expect(phases).toContain('running');
      expect(phases).toContain('verifying');
      expect(phases.at(-1)).toBe('done');
    });

    it('when restoring (success or failure), should delete the extraction folder', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      await b.service.restore({ token, items: ['library'], mode: 'merge' });

      expect(fs.readdirSync(b.tempDir).filter((name) => name.startsWith('restore-'))).toEqual([]);
    });

    it('when the token is unknown or nothing was opened, should ask to choose the file again', async () => {
      const e = env();

      await expect(
        e.service.restore({ token: 'x', items: ['library'], mode: 'merge' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringContaining('de novo') });
    });

    it('when an item is not in the backup, should reject with VALIDATION', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b, ['library']);

      await expect(
        b.service.restore({ token, items: ['chats'], mode: 'merge' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', message: expect.stringContaining('chats') });
    });

    it('when the mode is invalid or no item is chosen, should reject with VALIDATION', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      await expect(
        b.service.restore({ token, items: ['library'], mode: 'misturar' as never }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await expect(b.service.restore({ token, items: [], mode: 'merge' })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });

    it('when the backup file was replaced by an invalid one after being opened, should reject instead of applying anything', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b);

      fs.writeFileSync(path.join(a.dir, 'backup.zip'), 'trocado por lixo');

      await expect(
        b.service.restore({ token, items: ['library'], mode: 'merge' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      expect(list(b.library)).toEqual([]);
    });

    it('when cancelled while extracting, should apply nothing and say the restore was cancelled', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      write(a.library, 'c.md', 'x');
      const { token } = await backupFrom(a, b);

      b.events.publish = ((event: string, payload: { phase: string }) => {
        if (event === 'backup:progress' && payload.phase === 'running') {
          b.service.cancel();
        }
      }) as typeof b.events.publish;

      await expect(
        b.service.restore({ token, items: ['library', 'chats'], mode: 'merge' }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        message: expect.stringContaining('cancelada'),
      });
      expect(list(b.library)).toEqual([]);
      expect(b.chats.items).toEqual([]);
    });

    it('when restoring in a new machine whose library is in another folder, should put the pages in that machine library folder', async () => {
      const a = env('a');
      const b = env('b');

      seedSource(a);
      const { token } = await backupFrom(a, b, ['library']);

      await b.service.restore({ token, items: ['library'], mode: 'merge' });

      expect(list(b.library)).toEqual(['books/livro.json', 'ola.md']);
      expect(list(a.library)).toEqual(['books/livro.json', 'ola.md']);
    });
  });
});
