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

  it('when the ffmpeg path is a function, should call it on every read', () => {
    let path = '/a/ffmpeg';
    const config = new SettingsBackConfig(store, appPaths, {}, () => path);

    expect(config.ffmpegPath()).toBe('/a/ffmpeg');

    path = '/b/ffmpeg';

    expect(config.ffmpegPath()).toBe('/b/ffmpeg');
  });

  it('when created, should be a BackConfig so the back services can receive it', () => {
    expect(new SettingsBackConfig(store, appPaths, {})).toBeInstanceOf(BackConfig);
  });

  it('when reading the folders and the Ollama url, should answer the library from the settings and the other folders from the fixed paths', () => {
    const config = new SettingsBackConfig(store, appPaths, {});
    const settings = store.get();

    expect(config.libraryDir).toBe(settings.paths.libraryDir);
    expect(config.inboxDir).toBe(appPaths.inboxDir);
    expect(config.videoTempDir).toBe(appPaths.videoTempDir);
    expect(config.audioTempDir).toBe(appPaths.audioTempDir);
    expect(config.ollamaUrl).toBe(settings.local.ollama.url);
  });

  it('when an ffmpeg path is given, should expose it to the back', () => {
    const config = new SettingsBackConfig(store, appPaths, {}, 'C:/bin/ffmpeg.exe');

    expect(config.ffmpegPath()).toBe('C:/bin/ffmpeg.exe');
  });

  it('when the settings change, should answer the new values on the next read', () => {
    const config = new SettingsBackConfig(store, appPaths, {});
    const outra = path.resolve('/outra/biblioteca');

    store.update({ paths: { libraryDir: outra } });

    expect(config.libraryDir).toBe(outra);
  });

  it('when there is a Gemini key, should expose it; without one, should expose null', () => {
    expect(
      new SettingsBackConfig(store, appPaths, { gemini: 'AIza-chave' }).apiKeyFor('gemini'),
    ).toBe('AIza-chave');
    expect(new SettingsBackConfig(store, appPaths, {}).apiKeyFor('gemini')).toBeNull();
  });

  it('when the AI default is saved in Settings, should expose it live; otherwise null', () => {
    const config = new SettingsBackConfig(store, appPaths, {});

    expect(config.defaultAi()).toBeNull();

    store.update({ ai: { default: { providerId: 'anthropic', modelId: null } } });

    expect(config.defaultAi()).toEqual({ providerId: 'anthropic', modelId: null });
  });

  it('when asked for the usage file, should answer the one under data/ of the root', () => {
    expect(new SettingsBackConfig(store, appPaths, {}).usageFile).toBe(appPaths.usageFile);
  });
});
