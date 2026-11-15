import * as path from 'node:path';

import { importLegacyEnv } from './legacy-env-import';
import { SettingsStore } from './settings-store';
import { SecretStore, type SecretCipher } from './secret-store';
import { JsonFile } from './json-file';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

const cipher = (available = true): SecretCipher => ({
  isAvailable: () => available,
  encrypt: (plain) => `enc:${plain}`,
  decrypt: (encrypted) => encrypted.replace(/^enc:/, ''),
});

describe('importLegacyEnv', () => {
  let dir: string;
  const lib = path.resolve('/legacy/lib');

  const setup = (available = true) => {
    const settings = new SettingsStore(new JsonFile(path.join(dir, 's.json')), testDefaults());
    const secrets = new SecretStore(new JsonFile(path.join(dir, 'k.json')), cipher(available));
    const text = `LIB_DIR=${lib}\nGEMINI_API_KEY=AIza-legado\n`;

    return {
      settings,
      secrets,
      run: (overrides: Partial<Parameters<typeof importLegacyEnv>[0]> = {}) =>
        importLegacyEnv({
          settings,
          secrets,
          envFile: '/back/.env',
          exists: () => true,
          readFile: () => text,
          ...overrides,
        }),
    };
  };

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => removeDir(dir));

  it('when it is the first run and the .env exists, should import settings and the gemini key', () => {
    const { settings, secrets, run } = setup();

    expect(run()).toBe(true);
    expect(settings.get().paths.libraryDir).toBe(lib);
    expect(secrets.get('gemini.apiKey')).toBe('AIza-legado');
  });

  it('when settings were already saved, should not import again', () => {
    const { settings, run } = setup();
    settings.update({ paths: { libraryDir: path.resolve('/ja/configurado') } });

    expect(run()).toBe(false);
    expect(settings.get().paths.libraryDir).toBe(path.resolve('/ja/configurado'));
  });

  it('when the .env does not exist, should do nothing', () => {
    const { settings, run } = setup();

    expect(run({ exists: () => false })).toBe(false);
    expect(settings.isFirstRun()).toBe(true);
  });

  it('when the .env cannot be applied (invalid value), should ignore it and keep the defaults', () => {
    const { settings, run } = setup();

    expect(run({ readFile: () => 'LIB_DIR=relativo' })).toBe(false);
    expect(settings.get()).toEqual(testDefaults());
  });

  it('when reading the file fails, should ignore it', () => {
    const { run } = setup();

    expect(
      run({
        readFile: () => {
          throw new Error('EACCES');
        },
      }),
    ).toBe(false);
  });
});
