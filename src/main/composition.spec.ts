import * as fs from 'node:fs';
import * as path from 'node:path';

import { fakeCipher } from '../settings/secret-cipher.testing';
import { makeTempDir, removeDir } from '../settings/settings.testing';

import { createServices } from './composition';

describe('createServices', () => {
  let userData: string;
  let documents: string;

  const create = () =>
    createServices({
      userDataDir: userData,
      documentsDir: documents,
      projectRoot: path.resolve('/projeto/desktop'),
      platform: 'win32',
      arch: 'x64',
      cipher: fakeCipher(),
      exists: () => true,
      fetchFn: () => Promise.resolve({ ok: true, status: 200 }),
      ffmpegVersion: () => Promise.resolve('ffmpeg version 7'),
      checkGeminiKey: () => Promise.resolve(),
    });

  beforeEach(() => {
    userData = makeTempDir();
    documents = makeTempDir();
  });

  afterEach(() => {
    removeDir(userData);
    removeDir(documents);
  });

  it('when there is no saved configuration, should default the folders under Documentos/HomeLab', () => {
    const { settings } = create();

    expect(settings.get().paths.libraryDir).toBe(path.join(documents, 'HomeLab', 'library'));
    expect(settings.get().paths.inboxDir).toBe(path.join(documents, 'HomeLab', 'inbox'));
  });

  it('when the platform is win32-x64, should default whisper to resources/bin/win32-x64', () => {
    const { settings } = create();

    expect(settings.get().local.whisper.directory).toBe(
      path.join(path.resolve('/projeto/desktop'), 'resources', 'bin', 'win32-x64'),
    );
    expect(settings.get().local.whisper.executable).toBe('whisper-cli.exe');
  });

  it('when saving through the services, should write settings.json and secrets.json in userData', async () => {
    const services = create();

    services.settingsService.updatePaths({ libraryDir: path.resolve('/outra') });
    await services.externalProviders.save('gemini', 'AIza-chave-longa');

    expect(fs.existsSync(path.join(userData, 'settings.json'))).toBe(true);
    expect(fs.readFileSync(path.join(userData, 'secrets.json'), 'utf8')).not.toContain(
      'AIza-chave-longa',
    );
  });

  it('when listing the providers, should expose gemini as external and whisper, ollama and ffmpeg as local', async () => {
    const services = create();

    expect((await services.externalProviders.list()).map((p) => p.id)).toEqual(['gemini']);
    expect(services.localProviders.list().map((p) => p.id)).toEqual([
      'whisper',
      'ollama',
      'ffmpeg',
    ]);
  });
});
