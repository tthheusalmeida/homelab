import * as path from 'node:path';

import { IpcError } from '../shared/errors';

import {
  DesktopWhisperService,
  WhisperServiceMessages,
  type WhisperFiles,
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
});
