import * as path from 'node:path';

import { BackConfig } from '../back/config/back-config';

import { SettingsBackConfig } from './settings-back-config';
import { SettingsStore } from './settings-store';
import { JsonFile } from './json-file';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

describe('SettingsBackConfig', () => {
  let dir: string;
  let store: SettingsStore;

  beforeEach(() => {
    dir = makeTempDir();
    store = new SettingsStore(new JsonFile(path.join(dir, 'settings.json')), testDefaults());
  });

  afterEach(() => removeDir(dir));

  it('when created, should be a BackConfig so the back services can receive it', () => {
    expect(new SettingsBackConfig(store, null)).toBeInstanceOf(BackConfig);
  });

  it('when reading the folders and the Ollama url, should answer the values from the settings', () => {
    const config = new SettingsBackConfig(store, null);
    const settings = store.get();

    expect(config.libraryDir).toBe(settings.paths.libraryDir);
    expect(config.inboxDir).toBe(settings.paths.inboxDir);
    expect(config.videoTempDir).toBe(settings.paths.videoTempDir);
    expect(config.audioTempDir).toBe(settings.paths.audioTempDir);
    expect(config.ollamaUrl).toBe(settings.local.ollama.url);
  });

  it('when the settings change, should answer the new values on the next read', () => {
    const config = new SettingsBackConfig(store, null);
    const outra = path.resolve('/outra/biblioteca');

    store.update({ paths: { libraryDir: outra } });

    expect(config.libraryDir).toBe(outra);
  });

  it('when there is a Gemini key, should expose it; without one, should expose null', () => {
    expect(new SettingsBackConfig(store, 'AIza-chave').geminiApiKey).toBe('AIza-chave');
    expect(new SettingsBackConfig(store, null).geminiApiKey).toBeNull();
  });
});
