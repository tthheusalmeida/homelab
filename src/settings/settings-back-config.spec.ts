import * as path from 'node:path';

import { BackConfig } from '../back/config/back-config';

import { createAppPaths } from './app-paths';
import { SettingsBackConfig } from './settings-back-config';
import { SettingsStore } from './settings-store';
import { JsonFile } from '../storage/json-file';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

describe('SettingsBackConfig', () => {
  let dir: string;
  let store: SettingsStore;
  const appPaths = createAppPaths(path.resolve('/dados/HomeLab'));

  beforeEach(() => {
    dir = makeTempDir();
    store = new SettingsStore(new JsonFile(path.join(dir, 'settings.json')), testDefaults());
  });

  afterEach(() => removeDir(dir));

  it('when created, should be a BackConfig so the back services can receive it', () => {
    expect(new SettingsBackConfig(store, appPaths, null)).toBeInstanceOf(BackConfig);
  });

  it('when reading the folders and the Ollama url, should answer the library from the settings and the other folders from the fixed paths', () => {
    const config = new SettingsBackConfig(store, appPaths, null);
    const settings = store.get();

    expect(config.libraryDir).toBe(settings.paths.libraryDir);
    expect(config.inboxDir).toBe(appPaths.inboxDir);
    expect(config.videoTempDir).toBe(appPaths.videoTempDir);
    expect(config.audioTempDir).toBe(appPaths.audioTempDir);
    expect(config.ollamaUrl).toBe(settings.local.ollama.url);
  });

  it('when the settings change, should answer the new values on the next read', () => {
    const config = new SettingsBackConfig(store, appPaths, null);
    const outra = path.resolve('/outra/biblioteca');

    store.update({ paths: { libraryDir: outra } });

    expect(config.libraryDir).toBe(outra);
  });

  it('when there is a Gemini key, should expose it; without one, should expose null', () => {
    expect(new SettingsBackConfig(store, appPaths, 'AIza-chave').geminiApiKey).toBe('AIza-chave');
    expect(new SettingsBackConfig(store, appPaths, null).geminiApiKey).toBeNull();
  });

  it('when asked for the usage file, should answer the one under data/ of the root', () => {
    expect(new SettingsBackConfig(store, appPaths, null).usageFile).toBe(appPaths.usageFile);
  });
});
