import * as path from 'node:path';

import type { LocalAssistant } from '../back/config/local-assistant';
import { JsonFile } from '../storage/json-file';

import { createAppPaths } from './app-paths';
import { DEFAULT_OLLAMA_URL } from './settings-defaults';
import { SettingsBackConfig } from './settings-back-config';
import { SettingsStore } from './settings-store';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

describe('SettingsBackConfig com o assistente local', () => {
  let dir: string;
  let store: SettingsStore;
  let installed: boolean;
  const appPaths = createAppPaths(path.resolve('/dados/HomeLab'));
  const assistant: LocalAssistant = {
    baseUrl: 'http://127.0.0.1:11435',
    isInstalled: () => installed,
    ensureRunning: () => Promise.resolve(),
  };

  const config = (withAssistant = true) =>
    new SettingsBackConfig(
      store,
      appPaths,
      {},
      undefined,
      undefined,
      withAssistant ? assistant : undefined,
    );

  beforeEach(() => {
    dir = makeTempDir();
    store = new SettingsStore(new JsonFile(path.join(dir, 'settings.json')), testDefaults());
    installed = true;
  });

  afterEach(() => removeDir(dir));

  it('when the assistant is installed and the address is the default, should use the assistant', () => {
    store.update({ local: { ollama: { url: DEFAULT_OLLAMA_URL } } });

    expect(config().ollamaUrl).toBe('http://127.0.0.1:11435');
  });

  it('when the user set another address, should keep it even with the assistant installed', () => {
    store.update({ local: { ollama: { url: 'http://outro-pc:11434' } } });

    expect(config().ollamaUrl).toBe('http://outro-pc:11434');
  });

  it('when the assistant is not installed, should keep the configured address', () => {
    installed = false;
    store.update({ local: { ollama: { url: DEFAULT_OLLAMA_URL } } });

    expect(config().ollamaUrl).toBe(DEFAULT_OLLAMA_URL);
  });

  it('when the assistant gets installed later, should start using it without restarting', () => {
    installed = false;
    store.update({ local: { ollama: { url: DEFAULT_OLLAMA_URL } } });

    const current = config();

    expect(current.ollamaUrl).toBe(DEFAULT_OLLAMA_URL);

    installed = true;

    expect(current.ollamaUrl).toBe('http://127.0.0.1:11435');
  });

  it('when there is no assistant, should expose none and keep the configured address', () => {
    expect(config(false).localAssistant()).toBeNull();
    expect(config(false).ollamaUrl).toBe(store.get().local.ollama.url);
  });

  it('when there is an assistant, should hand it to the back services', () => {
    expect(config().localAssistant()).toBe(assistant);
  });
});
