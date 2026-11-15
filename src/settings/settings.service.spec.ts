import * as path from 'node:path';

import { JsonFile } from './json-file';
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
    expect(create().getAppearance()).toEqual({ theme: 'system', accent: 'cyan' });
  });

  it('when the appearance changes, should answer the new value and keep the rest', () => {
    const service = create();

    expect(service.updateAppearance({ theme: 'dark' })).toEqual({ theme: 'dark', accent: 'cyan' });
    expect(service.updateAppearance({ accent: 'rose' })).toEqual({ theme: 'dark', accent: 'rose' });
  });

  it('when the accent is invalid, should reject and keep the previous appearance', () => {
    const service = create();

    expect(() => service.updateAppearance({ accent: 'pink' as never })).toThrow(
      /cores de destaque/,
    );
    expect(service.getAppearance().accent).toBe('cyan');
  });
});
