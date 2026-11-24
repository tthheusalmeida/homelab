import * as path from 'node:path';

import type { AIService } from '../back/modules/ai/ai.service';
import { DefaultAiService } from '../back/modules/ai/default-ai.service';
import { JsonFile } from '../storage/json-file';

import { createAppPaths } from './app-paths';
import { SettingsBackConfig } from './settings-back-config';
import { SettingsService } from './settings.service';
import { SettingsStore } from './settings-store';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

/**
 * A cadeia de verdade, sem mocks: o que a tela salva em `SettingsService` chega ao
 * `DefaultAiService` que decide a IA em uso (mesmo `SettingsStore`, como no app).
 */
describe('AI default across Settings and DefaultAiService', () => {
  let dir: string;
  let settings: SettingsService;
  let defaultAi: DefaultAiService;

  beforeEach(() => {
    dir = makeTempDir();
    const store = new SettingsStore(new JsonFile(path.join(dir, 'settings.json')), testDefaults());
    const config = new SettingsBackConfig(store, createAppPaths(path.resolve('/dados/HomeLab')), {
      gemini: 'k',
      anthropic: 'k',
    });
    const ai = {
      cheapestModel: (provider: string) =>
        ({ gemini: 'gemini-barato', anthropic: 'claude-barato' })[provider],
    };

    settings = new SettingsService(store);
    defaultAi = new DefaultAiService(ai as unknown as AIService, config);
  });

  afterEach(() => removeDir(dir));

  it('when nothing was saved, should use the automatic AI', () => {
    expect(defaultAi.state().effective).toEqual({
      providerId: 'gemini',
      modelId: 'gemini-barato',
      source: 'auto',
    });
  });

  it('when a default is saved in Settings, should be the AI in use right away, with no restart', () => {
    settings.updateAiDefault({ providerId: 'anthropic', modelId: null });

    expect(defaultAi.state().effective).toEqual({
      providerId: 'anthropic',
      modelId: 'claude-barato',
      source: 'default',
    });
  });

  it('when the default is changed again, should follow the new one', () => {
    settings.updateAiDefault({ providerId: 'anthropic', modelId: null });
    settings.updateAiDefault({ providerId: 'gemini', modelId: 'gemini-x' });

    expect(defaultAi.state().effective).toMatchObject({
      providerId: 'gemini',
      modelId: 'gemini-x',
    });
  });

  it('when a switch for this session exists, should keep winning over a new default until it is cleared', () => {
    defaultAi.setSession({ providerId: 'gemini', modelId: null });
    settings.updateAiDefault({ providerId: 'anthropic', modelId: null });

    expect(defaultAi.state().effective.source).toBe('session');

    defaultAi.setSession(null);

    expect(defaultAi.state().effective).toMatchObject({
      providerId: 'anthropic',
      source: 'default',
    });
  });

  it('when the default is cleared, should go back to the automatic AI', () => {
    settings.updateAiDefault({ providerId: 'anthropic', modelId: null });
    settings.updateAiDefault(null);

    expect(defaultAi.state().effective.source).toBe('auto');
  });
});
