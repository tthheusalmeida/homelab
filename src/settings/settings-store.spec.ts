import * as fs from 'node:fs';
import * as path from 'node:path';

import type { SettingsPatch } from '../shared/contracts/settings';
import { IpcError } from '../shared/errors';

import { JsonFile } from './json-file';
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
    expect(store.get().local.whisper).toEqual(testDefaults().local.whisper);
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
    expect(settings.paths.inboxDir).toBe(testDefaults().paths.inboxDir);
    expect(settings.local).toEqual(testDefaults().local);
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
});
