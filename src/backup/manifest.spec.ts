import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  itemOfEntry,
  parseManifest,
  validateEntries,
  type BackupManifest,
} from './manifest';
import type { ZipEntryInfo } from './zip';

const manifest = (overrides: Partial<BackupManifest> = {}): BackupManifest => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  createdAt: '2026-01-01T10:00:00.000Z',
  appVersion: '1.0.0',
  items: [
    { id: 'library', kind: 'files', count: 2, bytes: 100 },
    { id: 'jobs', kind: 'records', count: 3, bytes: 50 },
  ],
  ...overrides,
});

const file = (name: string): ZipEntryInfo => ({ name, size: 1, isDirectory: false });
const folder = (name: string): ZipEntryInfo => ({ name, size: 0, isDirectory: true });

describe('itemOfEntry', () => {
  it.each([
    ['manifest.json', 'manifest'],
    ['library/ola.md', 'library'],
    ['library/books/livro.json', 'library'],
    ['inbox/pendente.md', 'inbox'],
    ['data/jobs.json', 'jobs'],
    ['data/chats.json', 'chats'],
    ['data/ai-usage.json', 'usage'],
    ['config/settings.json', 'settings'],
  ])('when the entry is %s, should belong to %s', (name, item) => {
    expect(itemOfEntry(name)).toBe(item);
  });

  it.each([
    'secrets.json',
    'temp/video/a.mp4',
    'library',
    'library/',
    'data/outra.json',
    'x/library/a.md',
  ])('when the entry is %s, should belong to no item', (name) => {
    expect(itemOfEntry(name)).toBeNull();
  });
});

describe('parseManifest', () => {
  it('when the manifest is valid, should answer it with the item kinds filled in', () => {
    const parsed = parseManifest(JSON.stringify(manifest()));

    expect(parsed.items).toEqual([
      { id: 'library', kind: 'files', count: 2, bytes: 100 },
      { id: 'jobs', kind: 'records', count: 3, bytes: 50 },
    ]);
    expect(parsed.appVersion).toBe('1.0.0');
  });

  it('when the zip has no manifest (null), should reject saying it is not a HomeLab backup', () => {
    expect(() => parseManifest(null)).toThrow(expect.objectContaining({ code: 'VALIDATION' }));
  });

  it.each([
    ['not JSON', 'isto não é json'],
    ['another format', JSON.stringify({ ...manifest(), format: 'outro' })],
    ['no items list', JSON.stringify({ format: BACKUP_FORMAT, version: 1 })],
    ['no version', JSON.stringify({ format: BACKUP_FORMAT, items: [] })],
  ])('when the manifest is %s, should reject with VALIDATION', (_label, text) => {
    expect(() => parseManifest(text)).toThrow(expect.objectContaining({ code: 'VALIDATION' }));
  });

  it('when the backup comes from a newer version, should reject asking to update the app', () => {
    expect(() => parseManifest(JSON.stringify(manifest({ version: BACKUP_VERSION + 1 })))).toThrow(
      /versão mais nova/,
    );
  });

  it('when an item is unknown or malformed, should ignore only that item', () => {
    const parsed = parseManifest(
      JSON.stringify({
        ...manifest(),
        items: [
          { id: 'secrets', count: 1, bytes: 1 },
          { id: 'chats', count: 'muitos', bytes: 1 },
          { id: 'inbox', count: 1, bytes: 10 },
        ],
      }),
    );

    expect(parsed.items.map((item) => item.id)).toEqual(['inbox']);
  });
});

describe('validateEntries', () => {
  it('when every entry is known and every announced item is present, should accept', () => {
    expect(() =>
      validateEntries(
        [
          file('manifest.json'),
          file('library/ola.md'),
          file('library/a/b.md'),
          file('data/jobs.json'),
        ],
        manifest(),
      ),
    ).not.toThrow();
  });

  it('when the zip has an unknown file, should reject naming it', () => {
    expect(() =>
      validateEntries([file('manifest.json'), file('secrets.json')], manifest({ items: [] })),
    ).toThrow(/arquivo inesperado: secrets\.json/);
  });

  it('when the zip has a folder entry for a known top folder, should accept it', () => {
    expect(() =>
      validateEntries(
        [file('manifest.json'), folder('library/'), folder('library/books/')],
        manifest({ items: [] }),
      ),
    ).not.toThrow();
  });

  it('when the zip has a folder entry for an unknown folder, should reject', () => {
    expect(() =>
      validateEntries([file('manifest.json'), folder('temp/')], manifest({ items: [] })),
    ).toThrow(/inesperado/);
  });

  it('when a collection announced in the manifest has no file, should reject', () => {
    expect(() =>
      validateEntries([file('manifest.json'), file('library/ola.md')], manifest()),
    ).toThrow(/"jobs"/);
  });

  it('when a folder item announces files but none are in the zip, should reject', () => {
    expect(() =>
      validateEntries([file('manifest.json'), file('data/jobs.json')], manifest()),
    ).toThrow(/"library"/);
  });

  it('when a folder item announces zero files, should not require entries', () => {
    expect(() =>
      validateEntries(
        [file('manifest.json')],
        manifest({ items: [{ id: 'inbox', kind: 'files', count: 0, bytes: 0 }] }),
      ),
    ).not.toThrow();
  });
});
