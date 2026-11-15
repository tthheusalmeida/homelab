import * as path from 'node:path';

import {
  createFfmpegDefinition,
  createOllamaDefinition,
  createWhisperDefinition,
} from './local-definitions';

const whisperConfig = {
  directory: path.resolve('/w'),
  executable: 'whisper-cli.exe',
  model: 'm.bin',
};

describe('whisper definition', () => {
  it('when both executable and model exist, should answer ok', async () => {
    const definition = createWhisperDefinition(() => true);

    await expect(definition.test(whisperConfig)).resolves.toMatchObject({ ok: true });
  });

  it('when the executable is missing, should answer not ok naming the file', async () => {
    const definition = createWhisperDefinition((file) => !file.endsWith('whisper-cli.exe'));

    const result = await definition.test(whisperConfig);

    expect(result.ok).toBe(false);
    expect(result.message).toContain(path.join(whisperConfig.directory, 'whisper-cli.exe'));
  });

  it('when only the model is missing, should answer not ok naming the model', async () => {
    const definition = createWhisperDefinition((file) => !file.endsWith('m.bin'));

    const result = await definition.test(whisperConfig);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('m.bin');
  });

  it('when converting a config to a patch, should include only the informed fields', () => {
    const definition = createWhisperDefinition(() => true);

    expect(definition.toPatch({ model: 'x.bin' })).toEqual({
      local: { whisper: { model: 'x.bin' } },
    });
  });
});

describe('ollama definition', () => {
  it('when the server answers ok, should answer ok and call /api/tags without a double slash', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await createOllamaDefinition(fetchFn).test({ url: 'http://h:11434/' });

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith('http://h:11434/api/tags', expect.anything());
  });

  it('when the server answers an error status, should answer not ok with the status', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(createOllamaDefinition(fetchFn).test({ url: 'http://h' })).resolves.toEqual({
      ok: false,
      message: 'O Ollama respondeu com status 500.',
    });
  });

  it('when the server is unreachable, should answer not ok naming the url', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(createOllamaDefinition(fetchFn).test({ url: 'http://h:1' })).resolves.toEqual({
      ok: false,
      message: 'Não foi possível conectar ao Ollama em http://h:1.',
    });
  });
});

describe('ffmpeg definition', () => {
  it('when ffmpeg runs, should answer ok with the first line of its version', async () => {
    const definition = createFfmpegDefinition(() => Promise.resolve('ffmpeg version 7.1\nresto'));

    await expect(definition.test({})).resolves.toEqual({ ok: true, message: 'ffmpeg version 7.1' });
  });

  it('when ffmpeg is not available, should answer not ok asking to install it', async () => {
    const definition = createFfmpegDefinition(() => Promise.reject(new Error('ENOENT')));

    const result = await definition.test({});

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/PATH/);
  });

  it('when inspecting it, should be read-only', () => {
    expect(createFfmpegDefinition(() => Promise.resolve('')).editable).toBe(false);
  });
});
