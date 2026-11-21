import * as path from 'node:path';

import { DEFAULT_SUMMARY, DEFAULT_TRANSCRIPT } from '../shared/contracts/document-views';
import { DEFAULT_READING } from '../shared/contracts/reading';
import { JsonFile } from '../storage/json-file';
import { SettingsService } from './settings.service';
import { SettingsStore } from './settings-store';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

describe('SettingsService', () => {
  let dir: string;

  const create = () =>
    new SettingsService(new SettingsStore(new JsonFile(path.join(dir, 's.json')), testDefaults()));

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => removeDir(dir));

  it('when getting the paths, should answer the current folders', () => {
    expect(create().getPaths()).toEqual(testDefaults().paths);
  });

  it('when a folder changes, should answer the new paths and require restart', () => {
    const libraryDir = path.resolve('/nova');

    expect(create().updatePaths({ libraryDir })).toEqual({
      value: { ...testDefaults().paths, libraryDir },
      restartRequired: true,
    });
  });

  it('when nothing changes, should not require restart', () => {
    expect(create().updatePaths({}).restartRequired).toBe(false);
  });

  it('when getting the appearance, should answer the defaults', () => {
    expect(create().getAppearance()).toEqual({
      theme: 'system',
      accent: 'cyan',
      reading: DEFAULT_READING,
      transcript: DEFAULT_TRANSCRIPT,
      summary: DEFAULT_SUMMARY,
    });
  });

  it('when nothing was chosen, should answer that the star prompt is still shown', () => {
    expect(create().getSupport()).toEqual({ starPromptHidden: false });
  });

  it('when the star prompt is hidden, should answer and keep the choice', () => {
    const service = create();

    expect(service.updateSupport({ starPromptHidden: true })).toEqual({ starPromptHidden: true });
    expect(service.getSupport().starPromptHidden).toBe(true);
  });

  it('when the appearance changes, should answer the new value and keep the rest', () => {
    const service = create();

    expect(service.updateAppearance({ theme: 'dark' })).toEqual({
      theme: 'dark',
      accent: 'cyan',
      reading: DEFAULT_READING,
      transcript: DEFAULT_TRANSCRIPT,
      summary: DEFAULT_SUMMARY,
    });
    expect(service.updateAppearance({ accent: 'rose' })).toEqual({
      theme: 'dark',
      accent: 'rose',
      reading: DEFAULT_READING,
      transcript: DEFAULT_TRANSCRIPT,
      summary: DEFAULT_SUMMARY,
    });
  });

  it('when the accent is invalid, should reject and keep the previous appearance', () => {
    const service = create();

    expect(() => service.updateAppearance({ accent: 'brown' as never })).toThrow(
      /cores de destaque/,
    );
    expect(service.getAppearance().accent).toBe('cyan');
  });

  it('when only some reading preferences change, should answer them merged with the rest', () => {
    const service = create();

    expect(service.updateAppearance({ reading: { zoom: 120 } }).reading).toEqual({
      ...DEFAULT_READING,
      zoom: 120,
    });
    expect(service.updateAppearance({ reading: { background: 'amber' } }).reading).toEqual({
      ...DEFAULT_READING,
      zoom: 120,
      background: 'amber',
    });
  });

  it('when the reading font size is invalid, should reject and keep the previous one', () => {
    const service = create();

    expect(() => service.updateAppearance({ reading: { fontSize: 7 } })).toThrow(
      /tamanho da letra/,
    );
    expect(service.getAppearance().reading.fontSize).toBe(16);
  });
});
