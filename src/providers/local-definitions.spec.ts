import * as path from 'node:path';

import {
  createFfmpegDefinition,
  createOllamaDefinition,
  createWhisperDefinition,
  LocalTestMessages,
} from './local-definitions';

const whisperConfig = {
  directory: path.resolve('/w'),
  executable: 'whisper-cli.exe',
  model: 'm.bin',
};

describe('whisper definition', () => {
  it('when both executable and model exist, should answer ok', async () => {
    const definition = createWhisperDefinition(() => true, whisperConfig);

    await expect(definition.test({})).resolves.toMatchObject({ ok: true });
  });

  it('when the executable is missing, should answer not ok asking to install it', async () => {
    const definition = createWhisperDefinition(
      (file) => !file.endsWith('whisper-cli.exe'),
      whisperConfig,
    );

    const result = await definition.test({});

    expect(result.ok).toBe(false);
    expect(result.message).toBe(LocalTestMessages.whisperExecutableMissing);
  });

  it('when only the model is missing, should answer not ok asking to install a model', async () => {
    const definition = createWhisperDefinition((file) => !file.endsWith('m.bin'), whisperConfig);

    const result = await definition.test({});

    expect(result.ok).toBe(false);
    expect(result.message).toBe(LocalTestMessages.whisperModelMissing);
  });

  it('when the model is a full path outside the whisper folder, should test that path', async () => {
    const model = path.resolve('/modelos/grande.bin');
    const checked: string[] = [];
    const definition = createWhisperDefinition(
      (file) => {
        checked.push(file);

        return true;
      },
      { ...whisperConfig, model },
    );

    await expect(definition.test({})).resolves.toMatchObject({ ok: true });
    expect(checked).toContain(model);
    expect(checked).not.toContain(path.join(whisperConfig.directory, model));
  });

  it('when the model is a full path that does not exist, should answer not ok asking to install a model', async () => {
    const model = path.resolve('/modelos/grande.bin');
    const definition = createWhisperDefinition((file) => file !== model, {
      ...whisperConfig,
      model,
    });

    const result = await definition.test({});

    expect(result.ok).toBe(false);
    expect(result.message).toBe(LocalTestMessages.whisperModelMissing);
  });

  it('when reading its config, should expose nothing because the values are fixed', () => {
    const definition = createWhisperDefinition(() => true, whisperConfig);

    expect(definition.editable).toBe(false);
    expect(definition.read({} as never)).toEqual({});
    expect(definition.toPatch({ model: 'x.bin' })).toEqual({});
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
  it('when ffmpeg runs, should answer ok without exposing the tool or its version', async () => {
    const definition = createFfmpegDefinition(() => Promise.resolve('ffmpeg version 7.1\nresto'));

    await expect(definition.test({})).resolves.toEqual({
      ok: true,
      message: LocalTestMessages.ffmpegOk,
    });
  });

  it('when ffmpeg is not available, should answer not ok asking to install it', async () => {
    const definition = createFfmpegDefinition(() => Promise.reject(new Error('ENOENT')));

    const result = await definition.test({});

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Componentes/);
  });

  it('when inspecting it, should be read-only', () => {
    expect(createFfmpegDefinition(() => Promise.resolve('')).editable).toBe(false);
  });
});
