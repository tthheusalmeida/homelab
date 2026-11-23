import * as path from 'node:path';

import { IpcError } from '../shared/errors';

import {
  DesktopWhisperService,
  WhisperServiceMessages,
  type WhisperFiles,
  type WhisperRunner,
} from './desktop-whisper.service';
import { WhisperBinaryResolver, type WhisperLocation } from './whisper-binary-resolver';

const dir = path.resolve('/bin/win32-x64');
const exe = path.join(dir, 'whisper-cli.exe');
const model = path.join(dir, 'm.bin');
const audio = path.resolve('/temp/audio/job.wav');
const config: WhisperLocation = { directory: dir, executable: 'whisper-cli.exe', model: 'm.bin' };

function setup(options: { existing?: string[]; text?: string; runError?: Error } = {}) {
  const existing = new Set(options.existing ?? [exe, model, audio]);
  const run = jest.fn(() =>
    options.runError ? Promise.reject(options.runError) : Promise.resolve(undefined),
  );
  const files: Record<keyof WhisperFiles, jest.Mock> = {
    exists: jest.fn((file: string) => existing.has(file)),
    readText: jest.fn().mockResolvedValue(options.text ?? '  texto transcrito \n'),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const resolver = new WhisperBinaryResolver({
    platform: 'win32',
    arch: 'x64',
    exists: (file) => existing.has(file),
  });
  const service = new DesktopWhisperService({ config: () => config, resolver, run, files });

  return { service, run, files };
}

describe('DesktopWhisperService', () => {
  it('when everything exists, should run whisper with the resolved paths and the same arguments as the back', async () => {
    const { service, run } = setup();

    await service.transcribe(audio);

    expect(run).toHaveBeenCalledWith(exe, [
      '-m',
      model,
      '-f',
      audio,
      '-l',
      'pt',
      '--no-prints',
      '--output-txt',
      '-of',
      audio,
    ]);
  });

  it('when whisper writes the text file, should answer it trimmed and read the right file', async () => {
    const { service, files } = setup({ text: '\n  Olá mundo  \n' });

    await expect(service.transcribe(audio)).resolves.toBe('Olá mundo');
    expect(files.readText).toHaveBeenCalledWith(`${audio}.txt`);
  });

  it('when the transcription finishes, should remove the text file', async () => {
    const { service, files } = setup();

    await service.transcribe(audio);

    expect(files.remove).toHaveBeenCalledWith(`${audio}.txt`);
  });

  it('when whisper fails, should throw the same message as the back keeping the cause, and still remove the text file', async () => {
    const cause = new Error('exit 1');
    const { service, files } = setup({ runError: cause });

    const error = await service.transcribe(audio).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(WhisperServiceMessages.transcribeFailed);
    expect((error as Error).cause).toBe(cause);
    expect(files.remove).toHaveBeenCalledWith(`${audio}.txt`);
  });

  it('when removing the text file fails, should ignore it and still answer the text', async () => {
    const { service, files } = setup();
    files.remove.mockRejectedValue(new Error('em uso'));

    await expect(service.transcribe(audio)).resolves.toBe('texto transcrito');
  });

  it('when the executable is missing, should throw NOT_CONFIGURED asking to install it and not run the transcription', async () => {
    const { service, run } = setup({ existing: [model, audio] });

    const error = await service.transcribe(audio).catch((e: IpcError) => e);

    expect((error as IpcError).code).toBe('NOT_CONFIGURED');
    expect((error as IpcError).message).toContain('Configurações > Componentes');
    expect((error as IpcError).message).not.toContain(exe);
    expect(run).not.toHaveBeenCalled();
  });

  it('when the model is missing, should throw a clear NOT_CONFIGURED without exposing the file and not run the transcription', async () => {
    const { service, run } = setup({ existing: [exe, audio] });

    const error = await service.transcribe(audio).catch((e: IpcError) => e);

    expect((error as IpcError).code).toBe('NOT_CONFIGURED');
    expect((error as IpcError).message).toContain('Configurações > Componentes');
    expect((error as IpcError).message).not.toContain(model);
    expect(run).not.toHaveBeenCalled();
  });

  it('when the audio file is missing, should throw naming it and not run whisper', async () => {
    const { service, run } = setup({ existing: [exe, model] });

    await expect(service.transcribe(audio)).rejects.toThrow(
      WhisperServiceMessages.audioMissing(audio),
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('when the configuration changes between calls, should use the current one', async () => {
    const other = path.resolve('/outro/whisper-cli.exe');
    const otherModel = path.resolve('/modelos/grande.bin');
    const existing = new Set([exe, model, audio, other, otherModel]);
    let current: WhisperLocation = config;
    const run = jest.fn().mockResolvedValue(undefined);
    const service = new DesktopWhisperService({
      config: () => current,
      resolver: new WhisperBinaryResolver({
        platform: 'win32',
        arch: 'x64',
        exists: (file) => existing.has(file),
      }),
      run,
      files: {
        exists: (file) => existing.has(file),
        readText: () => Promise.resolve('x'),
        remove: () => Promise.resolve(),
      },
    });

    await service.transcribe(audio);
    current = {
      directory: path.resolve('/outro'),
      executable: 'whisper-cli.exe',
      model: otherModel,
    };
    await service.transcribe(audio);

    expect(run).toHaveBeenNthCalledWith(1, exe, expect.arrayContaining(['-m', model]));
    expect(run).toHaveBeenNthCalledWith(2, other, expect.arrayContaining(['-m', otherModel]));
  });

  describe('transcribeSegments', () => {
    const json = JSON.stringify({
      transcription: [
        { offsets: { from: 0, to: 3000 }, text: ' Olá' },
        { offsets: { from: 3000, to: 7000 }, text: ' mundo.' },
      ],
    });

    it('when everything exists, should ask whisper for the json output of the same audio', async () => {
      const { service, run } = setup({ text: json });

      await service.transcribeSegments(audio);

      expect(run).toHaveBeenCalledWith(exe, [
        '-m',
        model,
        '-f',
        audio,
        '-l',
        'pt',
        '--no-prints',
        '--output-json',
        '-of',
        audio,
      ]);
    });

    it('when whisper writes the json, should answer the segments with their times and read the right file', async () => {
      const { service, files } = setup({ text: json });

      await expect(service.transcribeSegments(audio)).resolves.toEqual([
        { startMs: 0, endMs: 3000, text: 'Olá' },
        { startMs: 3000, endMs: 7000, text: 'mundo.' },
      ]);
      expect(files.readText).toHaveBeenCalledWith(`${audio}.json`);
    });

    it('when the transcription finishes, should remove the json file', async () => {
      const { service, files } = setup({ text: json });

      await service.transcribeSegments(audio);

      expect(files.remove).toHaveBeenCalledWith(`${audio}.json`);
    });

    it('when the json is invalid, should throw the transcribe message keeping the cause and still remove the file', async () => {
      const { service, files } = setup({ text: 'nao e json' });

      const error = await service.transcribeSegments(audio).catch((e: Error) => e);

      expect((error as Error).message).toBe(WhisperServiceMessages.transcribeFailed);
      expect((error as Error).cause).toBeInstanceOf(Error);
      expect(files.remove).toHaveBeenCalledWith(`${audio}.json`);
    });

    it('when the audio does not exist, should not run whisper', async () => {
      const { service, run } = setup({ existing: [exe, model] });

      await expect(service.transcribeSegments(audio)).rejects.toThrow(
        WhisperServiceMessages.audioMissing(audio),
      );
      expect(run).not.toHaveBeenCalled();
    });
  });
});

describe('DesktopWhisperService: cancelamento', () => {
  const abort = () => Object.assign(new Error('Operação cancelada.'), { name: 'AbortError' });

  function build(run: WhisperRunner) {
    const remove = jest.fn().mockResolvedValue(undefined);
    const service = new DesktopWhisperService({
      config: () => ({}) as never,
      resolver: {
        resolveExecutable: () => '/bin/whisper',
        resolveModel: () => '/models/m.bin',
      } as never,
      run,
      files: { exists: () => true, readText: jest.fn(), remove },
    });

    return { service, remove };
  }

  it('when cancelled, should pass the signal to the program and rethrow the cancellation as is', async () => {
    const controller = new AbortController();
    const run = jest.fn(async () => {
      throw abort();
    });
    const { service } = build(run);

    await expect(service.transcribe('/a.wav', undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(run).toHaveBeenCalledWith(
      '/bin/whisper',
      expect.any(Array),
      undefined,
      controller.signal,
    );
  });

  it('when cancelled, should remove the partial output file', async () => {
    const { service, remove } = build(
      jest.fn(async () => {
        throw abort();
      }),
    );

    await expect(
      service.transcribeSegments('/a.wav', undefined, new AbortController().signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(remove).toHaveBeenCalledWith('/a.wav.json');
  });
});
