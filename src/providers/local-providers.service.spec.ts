import * as path from 'node:path';

import { IpcError } from '../shared/errors';
import { JsonFile } from '../storage/json-file';
import { SettingsStore } from '../settings/settings-store';
import { makeTempDir, removeDir, testDefaults } from '../settings/settings.testing';

import {
  createFfmpegDefinition,
  createOllamaDefinition,
  createWhisperDefinition,
} from './local-definitions';
import { LocalProvidersService } from './local-providers.service';

describe('LocalProvidersService', () => {
  let dir: string;
  let store: SettingsStore;
  const exists = jest.fn();
  const fetchFn = jest.fn();
  const version = jest.fn();

  const create = () =>
    new LocalProvidersService(
      [
        createWhisperDefinition(exists, {
          directory: path.resolve('/w'),
          executable: 'whisper-cli.exe',
          model: 'm.bin',
        }),
        createOllamaDefinition(fetchFn),
        createFfmpegDefinition(version),
      ],
      store,
    );

  beforeEach(() => {
    dir = makeTempDir();
    store = new SettingsStore(new JsonFile(path.join(dir, 's.json')), testDefaults());
    exists.mockReset().mockReturnValue(true);
    fetchFn.mockReset().mockResolvedValue({ ok: true, status: 200 });
    version.mockReset().mockResolvedValue('ffmpeg version 7.1\nbuilt with gcc');
  });

  afterEach(() => removeDir(dir));

  it('when listing, should answer whisper, ollama and ffmpeg with their current config', () => {
    const list = create().list();

    expect(list.map((p) => p.id)).toEqual(['whisper', 'ollama', 'ffmpeg']);
    expect(list[0]).toMatchObject({ editable: false, config: {} });
    expect(list[1].config).toEqual({ url: testDefaults().local.ollama.url });
    expect(list[2]).toMatchObject({ editable: false, config: {} });
  });

  it('when saving the ollama url, should persist it and require restart', () => {
    const service = create();

    const result = service.save('ollama', { url: 'http://192.168.0.5:11434' });

    expect(result.restartRequired).toBe(true);
    expect(result.value.config.url).toBe('http://192.168.0.5:11434');
    expect(store.get().local.ollama.url).toBe('http://192.168.0.5:11434');
  });

  it('when saving the same config again, should not require restart', () => {
    const service = create();
    service.save('ollama', { url: 'http://x:1' });

    expect(service.save('ollama', { url: 'http://x:1' }).restartRequired).toBe(false);
  });

  it('when saving whisper, should reject because it uses the fixed defaults', () => {
    expect(() => create().save('whisper', { model: 'ggml-base.bin' })).toThrow(
      /não é configurável/,
    );
  });

  it('when saving an invalid config, should throw VALIDATION and keep the settings', () => {
    expect(() => create().save('ollama', { url: 'nao-e-url' })).toThrow(IpcError);
    expect(store.get().local.ollama.url).toBe(testDefaults().local.ollama.url);
  });

  it('when saving ffmpeg, should reject because it is not configurable', () => {
    expect(() => create().save('ffmpeg', {})).toThrow(/não é configurável/);
  });

  it('when the provider id is unknown, should throw NOT_FOUND', () => {
    expect(() => create().get('x' as never)).toThrow(/não encontrado: x/);
  });

  it('when testing with a candidate config, should merge it over the saved one', async () => {
    await create().test('ollama', { url: 'http://candidato:1/' });

    expect(fetchFn).toHaveBeenCalledWith('http://candidato:1/api/tags', expect.anything());
  });

  it('when the test itself throws, should answer not ok instead of rejecting', async () => {
    const service = new LocalProvidersService(
      [
        {
          ...createFfmpegDefinition(version),
          test: () => Promise.reject(new Error('explodiu')),
        },
      ],
      store,
    );

    await expect(service.test('ffmpeg')).resolves.toEqual({
      ok: false,
      message: 'Não foi possível testar o provider.: explodiu',
    });
  });
});
