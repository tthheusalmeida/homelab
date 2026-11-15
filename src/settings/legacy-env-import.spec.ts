import * as path from 'node:path';

import { importLegacyEnv } from './legacy-env-import';
import { SettingsStore } from './settings-store';
import { SecretStore } from './secret-store';
import { JsonFile } from './json-file';
import { fakeCipher } from './secret-cipher.testing';
import { makeTempDir, removeDir, testDefaults } from './settings.testing';

describe('importLegacyEnv', () => {
  let dir: string;
  const lib = path.resolve('/legacy/lib');

  const setup = (available = true) => {
    const settings = new SettingsStore(new JsonFile(path.join(dir, 's.json')), testDefaults());
    const secrets = new SecretStore(
      new JsonFile(path.join(dir, 'k.json')),
      fakeCipher({ available }),
    );
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

  it('when it is the first run and the .env exists, should import settings and the gemini key', async () => {
    const { settings, secrets, run } = setup();

    await expect(run()).resolves.toBe(true);
    expect(settings.get().paths.libraryDir).toBe(lib);
    await expect(secrets.get('gemini.apiKey')).resolves.toBe('AIza-legado');
  });

  it('when settings were already saved, should not import again', async () => {
    const { settings, run } = setup();
    settings.update({ paths: { libraryDir: path.resolve('/ja/configurado') } });

    await expect(run()).resolves.toBe(false);
    expect(settings.get().paths.libraryDir).toBe(path.resolve('/ja/configurado'));
  });

  it('when the .env does not exist, should do nothing', async () => {
    const { settings, run } = setup();

    await expect(run({ exists: () => false })).resolves.toBe(false);
    expect(settings.isFirstRun()).toBe(true);
  });

  it('when the .env cannot be applied (invalid value), should ignore it and keep the defaults', async () => {
    const { settings, run } = setup();

    await expect(run({ readFile: () => 'LIB_DIR=relativo' })).resolves.toBe(false);
    expect(settings.get()).toEqual(testDefaults());
  });

  it('when reading the file fails, should ignore it', async () => {
    const { run } = setup();

    await expect(
      run({
        readFile: () => {
          throw new Error('EACCES');
        },
      }),
    ).resolves.toBe(false);
  });
});
