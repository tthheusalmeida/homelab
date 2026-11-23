import * as fs from 'node:fs';
import * as path from 'node:path';

import { FakeEventPublisher } from '../ipc/testing/fake-event-publisher';
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
  let root: string;

  let events: FakeEventPublisher;

  const create = (io = whisperIo()) =>
    createServices({
      events,
      userDataDir: userData,
      rootDir: root,
      resourcesDir: path.resolve('/projeto/desktop/resources'),
      platform: 'win32',
      arch: 'x64',
      cipher: fakeCipher(),
      exists: () => true,
      fetchFn: () => Promise.resolve({ ok: true, status: 200 }),
      ffmpegVersion: () => Promise.resolve('ffmpeg version 7'),
      checkGeminiKey: () => Promise.resolve(),
      checkAnthropicKey: () => Promise.resolve(),
      downloadFetch: () => Promise.reject(new Error('sem rede nos testes')),
      runForOutput: () => Promise.reject(new Error('sem programas nos testes')),
      totalMemoryMb: () => 16384,
      whisperIo: io,
    });

  beforeEach(() => {
    userData = makeTempDir();
    events = new FakeEventPublisher();
    root = makeTempDir();
  });

  afterEach(() => {
    removeDir(userData);
    removeDir(root);
  });

  it('when there is no saved configuration, should default the library under <root>/library', () => {
    const { settings } = create();

    expect(settings.get().paths.libraryDir).toBe(path.join(root, 'library'));
  });

  it('when creating the services, should expose the fixed folders derived from the root', () => {
    const { appPaths } = create();

    expect(appPaths.inboxDir).toBe(path.join(root, 'inbox'));
    expect(appPaths.videoTempDir).toBe(path.join(root, 'temp', 'video'));
    expect(appPaths.usageFile).toBe(path.join(root, 'data', 'ai-usage.json'));
  });

  it('when transcribing through the services, should use the default whisper (<userData>/bin/win32-x64, whisper-cli.exe and the default model)', async () => {
    const io = whisperIo();
    const services = create(io);
    const directory = path.join(userData, 'bin', 'win32-x64');

    await expect(services.whisper.transcribe(path.resolve('/a.wav'))).resolves.toBe('texto');

    expect(io.run).toHaveBeenCalledWith(
      path.join(directory, 'whisper-cli.exe'),
      expect.arrayContaining(['-m', path.join(directory, 'ggml-large-v3-turbo.bin')]),
    );
  });

  it('when saving through the services, should write settings.json under <root>/config and secrets.json in userData', async () => {
    const services = create();

    services.settingsService.updatePaths({ libraryDir: path.resolve('/outra') });
    await services.externalProviders.save('gemini', 'AIza-chave-longa');

    expect(fs.existsSync(path.join(root, 'config', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(userData, 'settings.json'))).toBe(false);
    expect(fs.readFileSync(path.join(userData, 'secrets.json'), 'utf8')).not.toContain(
      'AIza-chave-longa',
    );
  });

  it('when listing the providers, should expose gemini and anthropic as external and the transcription and audio tools before ollama as local', async () => {
    const services = create();

    expect((await services.externalProviders.list()).map((p) => p.id)).toEqual([
      'gemini',
      'anthropic',
    ]);
    expect(services.localProviders.list().map((p) => p.id)).toEqual([
      'whisper',
      'ffmpeg',
      'ollama',
    ]);
  });

  it('when moving the library through the services, should copy, save the new folder and publish progress to the windows', async () => {
    const services = create();
    const current = services.settings.get().paths.libraryDir;
    const nova = path.join(root, 'biblioteca-nova');

    fs.mkdirSync(current, { recursive: true });
    fs.writeFileSync(path.join(current, 'ola.md'), '# Olá');

    const result = await services.libraryMover.apply({ to: nova, mode: 'move' });

    expect(result.restartRequired).toBe(true);
    expect(services.settings.get().paths.libraryDir).toBe(nova);
    expect(fs.readFileSync(path.join(nova, 'ola.md'), 'utf8')).toBe('# Olá');
    expect(events.payloadsOf('library-move:progress').map((progress) => progress.phase)).toEqual(
      expect.arrayContaining(['preparing', 'running', 'done']),
    );
  });

  it('when listing the local providers, should show whisper as test-only', () => {
    const whisper = create()
      .localProviders.list()
      .find((provider) => provider.id === 'whisper');

    expect(whisper).toMatchObject({ editable: false, config: {} });
  });
});
