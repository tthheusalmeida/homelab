import * as fs from 'node:fs';
import * as path from 'node:path';

import { DEFAULT_READING } from '../shared/contracts/reading';
import type { SettingsPatch } from '../shared/contracts/settings';
import { IpcError } from '../shared/errors';

import { JsonFile } from '../storage/json-file';
import { SettingsStore } from './settings-store';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

describe('SettingsStore', () => {
  let dir: string;
  let target: string;

  const create = () => new SettingsStore(new JsonFile<SettingsPatch>(target), testDefaults());

  beforeEach(() => {
    dir = makeTempDir();
    target = path.join(dir, 'settings.json');
  });

  afterEach(() => removeDir(dir));

  it('when there is no file, should start with the defaults and flag the first run', () => {
    const store = create();

    expect(store.get()).toEqual(testDefaults());
    expect(store.isFirstRun()).toBe(true);
  });

  it('when updating a value, should save it, report the change and survive a reload', () => {
    const store = create();
    const libraryDir = path.resolve('/minha/biblioteca');

    const result = store.update({ paths: { libraryDir } });

    expect(result.changed).toBe(true);
    expect(result.settings.paths.libraryDir).toBe(libraryDir);
    expect(store.isFirstRun()).toBe(false);
    expect(create().get().paths.libraryDir).toBe(libraryDir);
  });

  it('when updating with the same values, should report no change', () => {
    const store = create();
    store.update({ paths: { libraryDir: path.resolve('/a') } });

    expect(store.update({ paths: { libraryDir: path.resolve('/a') } }).changed).toBe(false);
  });

  it('when updating only one section, should keep the others untouched', () => {
    const store = create();

    store.update({ local: { ollama: { url: 'http://outro:1234' } } });

    expect(store.get().paths).toEqual(testDefaults().paths);
    expect(store.get().local.ollama.url).toBe('http://outro:1234');
  });

  it('when the patch is invalid, should throw and keep the previous settings and file', () => {
    const store = create();
    store.update({ paths: { libraryDir: path.resolve('/ok') } });
    const saved = fs.readFileSync(target, 'utf8');

    expect(() => store.update({ paths: { libraryDir: 'relativo' } })).toThrow(IpcError);
    expect(store.get().paths.libraryDir).toBe(path.resolve('/ok'));
    expect(fs.readFileSync(target, 'utf8')).toBe(saved);
  });

  it('when the file lacks some values, should fill them with the defaults', () => {
    fs.writeFileSync(target, JSON.stringify({ paths: { libraryDir: path.resolve('/so-essa') } }));

    const settings = create().get();

    expect(settings.paths.libraryDir).toBe(path.resolve('/so-essa'));
    expect(settings.local).toEqual(testDefaults().local);
  });

  it('when the file still has values from the old layout (other folders, whisper), should ignore them', () => {
    fs.writeFileSync(
      target,
      JSON.stringify({
        paths: {
          libraryDir: path.resolve('/lib'),
          inboxDir: path.resolve('/velha/inbox'),
          videoTempDir: path.resolve('/velha/video'),
        },
        local: { whisper: { directory: path.resolve('/velho/whisper') } },
      }),
    );

    const store = create();

    expect(store.get().paths).toEqual({ libraryDir: path.resolve('/lib') });
    expect(store.get().local).toEqual(testDefaults().local);

    store.update({ appearance: { theme: 'dark' } });

    expect(JSON.parse(fs.readFileSync(target, 'utf8'))).not.toHaveProperty('local.whisper');
    expect(JSON.parse(fs.readFileSync(target, 'utf8')).paths).toEqual({
      libraryDir: path.resolve('/lib'),
    });
  });

  it('when the file is corrupted, should quarantine it and start with the defaults', () => {
    fs.writeFileSync(target, '{ quebrado');

    const store = create();

    expect(store.get()).toEqual(testDefaults());
    expect(fs.existsSync(`${target}.corrupt`)).toBe(true);
    expect(store.isFirstRun()).toBe(true);
  });

  it('when reading, should return a copy that cannot change the stored settings', () => {
    const store = create();

    store.get().paths.libraryDir = 'mudou';

    expect(store.get().paths.libraryDir).toBe(testDefaults().paths.libraryDir);
  });

  it('when there is no saved appearance, should default to the system theme with the cyan accent', () => {
    expect(create().get().appearance).toEqual({
      theme: 'system',
      accent: 'cyan',
      reading: DEFAULT_READING,
    });
  });

  it('when the appearance changes, should save only what changed and survive a reload', () => {
    const store = create();

    store.update({ appearance: { accent: 'violet' } });

    expect(create().get().appearance).toEqual({
      theme: 'system',
      accent: 'violet',
      reading: DEFAULT_READING,
    });
  });

  it('when only part of the reading preferences changes, should keep the rest and survive a reload', () => {
    const store = create();

    store.update({ appearance: { reading: { fontSize: 20 } } });
    store.update({ appearance: { reading: { font: 'lora' } } });

    expect(create().get().appearance.reading).toEqual({
      ...DEFAULT_READING,
      fontSize: 20,
      font: 'lora',
    });
  });

  it('when an old file has an appearance without reading, should fill the reading with the defaults', () => {
    fs.writeFileSync(target, JSON.stringify({ appearance: { theme: 'dark', accent: 'rose' } }));

    expect(create().get().appearance).toEqual({
      theme: 'dark',
      accent: 'rose',
      reading: DEFAULT_READING,
    });
  });

  it('when an old file has no appearance, should fill it with the defaults', () => {
    fs.writeFileSync(target, JSON.stringify({ paths: { libraryDir: path.resolve('/x') } }));

    expect(create().get().appearance).toEqual({
      theme: 'system',
      accent: 'cyan',
      reading: DEFAULT_READING,
    });
  });

  it('when there is no saved updates preference, should check for updates automatically', () => {
    expect(create().get().updates).toEqual({ autoCheck: true });
  });

  it('when an old file has no updates section, should fill it with the defaults', () => {
    fs.writeFileSync(target, JSON.stringify({ paths: { libraryDir: path.resolve('/x') } }));

    expect(create().get().updates.autoCheck).toBe(true);
  });

  it('when the automatic check is turned off, should save it and survive a reload', () => {
    create().update({ updates: { autoCheck: false } });

    expect(create().get().updates.autoCheck).toBe(false);
  });

  it('when another section changes, should keep the automatic check as it was', () => {
    const store = create();

    store.update({ updates: { autoCheck: false } });
    store.update({ appearance: { theme: 'dark' } });

    expect(store.get().updates.autoCheck).toBe(false);
  });

  it('when the main file is corrupt but the backup is good, should load the backup and flag it as recovered', () => {
    const first = create();

    first.update({ appearance: { theme: 'dark' } });
    first.update({ appearance: { theme: 'light' } });
    fs.writeFileSync(target, '{ quebrado');

    const reopened = create();

    expect(reopened.get().appearance.theme).toBe('dark');
    expect(reopened.recoveredFromBackup).toBe(true);
  });

  it('when the file is healthy, should not flag a recovery', () => {
    const store = create();

    store.update({ appearance: { theme: 'dark' } });

    expect(create().recoveredFromBackup).toBe(false);
  });
});
