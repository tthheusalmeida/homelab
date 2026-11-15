import * as fs from 'node:fs';
import * as path from 'node:path';

import { fakeCipher } from '../settings/secret-cipher.testing';
import { makeTempDir, removeDir } from '../settings/settings.testing';

import { createServices } from './composition';

const whisperIo = () => ({
  run: jest.fn().mockResolvedValue(undefined),
  readText: jest.fn().mockResolvedValue(' texto '),
  remove: jest.fn().mockResolvedValue(undefined),
});

describe('createServices', () => {
  let userData: string;
  let documents: string;

  const create = () =>
    createServices({
      userDataDir: userData,
      documentsDir: documents,
      resourcesDir: path.resolve('/projeto/desktop/resources'),
      platform: 'win32',
      arch: 'x64',
      cipher: fakeCipher(),
      exists: () => true,
      fetchFn: () => Promise.resolve({ ok: true, status: 200 }),
      ffmpegVersion: () => Promise.resolve('ffmpeg version 7'),
      checkGeminiKey: () => Promise.resolve(),
      whisperIo: whisperIo(),
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
      path.join(path.resolve('/projeto/desktop/resources'), 'bin', 'win32-x64'),
    );
    expect(settings.get().local.whisper.executable).toBe('whisper-cli.exe');
  });

  it('when transcribing through the services, should use the whisper folder, executable and model from the settings', async () => {
    const io = whisperIo();
    const services = createServices({
      userDataDir: userData,
      documentsDir: documents,
      resourcesDir: path.resolve('/projeto/desktop/resources'),
      platform: 'win32',
      arch: 'x64',
      cipher: fakeCipher(),
      exists: () => true,
      fetchFn: () => Promise.resolve({ ok: true, status: 200 }),
      ffmpegVersion: () => Promise.resolve('ffmpeg version 7'),
      checkGeminiKey: () => Promise.resolve(),
      whisperIo: io,
    });
    const whisper = services.settings.get().local.whisper;

    await expect(services.whisper.transcribe(path.resolve('/a.wav'))).resolves.toBe('texto');

    expect(io.run).toHaveBeenCalledWith(
      path.join(whisper.directory, whisper.executable),
      expect.arrayContaining(['-m', path.join(whisper.directory, whisper.model)]),
    );
  });

  it('when the whisper folder is changed in the settings, should transcribe with the new one without recreating the service', async () => {
    const io = whisperIo();
    const services = createServices({
      userDataDir: userData,
      documentsDir: documents,
      resourcesDir: path.resolve('/projeto/desktop/resources'),
      platform: 'win32',
      arch: 'x64',
      cipher: fakeCipher(),
      exists: () => true,
      fetchFn: () => Promise.resolve({ ok: true, status: 200 }),
      ffmpegVersion: () => Promise.resolve('ffmpeg version 7'),
      checkGeminiKey: () => Promise.resolve(),
      whisperIo: io,
    });
    const model = path.resolve('/modelos/grande.bin');

    services.localProviders.save('whisper', { directory: path.resolve('/outro'), model });
    await services.whisper.transcribe(path.resolve('/a.wav'));

    expect(io.run).toHaveBeenCalledWith(
      path.join(path.resolve('/outro'), 'whisper-cli.exe'),
      expect.arrayContaining(['-m', model]),
    );
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
