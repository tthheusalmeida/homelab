import * as path from 'node:path';

import { IpcError } from '../shared/errors';

import {
  WhisperBinaryResolver,
  WhisperMessages,
  whisperModelPath,
  type WhisperLocation,
} from './whisper-binary-resolver';

const dir = path.resolve('/projeto/resources/bin/win32-x64');
const location: WhisperLocation = {
  directory: dir,
  executable: 'whisper-cli.exe',
  model: 'ggml-large-v3-turbo.bin',
};

function resolver(platform: NodeJS.Platform, arch: string, existing: string[] = []) {
  return new WhisperBinaryResolver({ platform, arch, exists: (file) => existing.includes(file) });
}

function thrown(run: () => unknown): IpcError {
  try {
    run();
  } catch (error) {
    return error as IpcError;
  }

  throw new Error('não lançou');
}

describe('whisperModelPath', () => {
  it('when the model is only a file name, should look for it inside the whisper folder', () => {
    expect(whisperModelPath(dir, 'm.bin')).toBe(path.join(dir, 'm.bin'));
  });

  it('when the model is a full path, should use it as it is, ignoring the whisper folder', () => {
    const model = path.resolve('/modelos/grande.bin');

    expect(whisperModelPath(dir, model)).toBe(model);
  });
});

describe('WhisperBinaryResolver: executável', () => {
  it('when win32-x64 has the binary in the folder, should answer its full path', () => {
    const file = path.join(dir, 'whisper-cli.exe');

    expect(resolver('win32', 'x64', [file]).resolveExecutable(location)).toBe(file);
  });

  it('when win32-x64 has no binary, should answer NOT_CONFIGURED naming the missing file', () => {
    const error = thrown(() => resolver('win32', 'x64').resolveExecutable(location));

    expect(error.code).toBe('NOT_CONFIGURED');
    expect(error.message).toBe(WhisperMessages.executableMissing());
  });

  it.each([
    ['darwin', 'arm64'],
    ['win32', 'arm64'],
    ['win32', 'ia32'],
  ] as const)(
    'when the platform is %s-%s and there is no binary, should answer UNSUPPORTED_PLATFORM',
    (platform, arch) => {
      const error = thrown(() => resolver(platform, arch).resolveExecutable(location));

      expect(error.code).toBe('UNSUPPORTED_PLATFORM');
      expect(error.message).toBe(WhisperMessages.unsupported);
    },
  );

  it('when the unsupported message is shown, should not mention tools or system identifiers', () => {
    expect(WhisperMessages.unsupported).not.toMatch(/whisper|win32|x64|linux/i);
  });

  it('when the platform is linux-x64 and there is no binary, should answer NOT_CONFIGURED because the app can download it', () => {
    const error = thrown(() => resolver('linux', 'x64').resolveExecutable(location));

    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('when an unsupported platform has the user own binary in the configured folder, should use it', () => {
    const own = { ...location, directory: path.resolve('/opt/whisper'), executable: 'whisper-cli' };
    const file = path.join(own.directory, own.executable);

    expect(resolver('darwin', 'arm64', [file]).resolveExecutable(own)).toBe(file);
  });
});

describe('WhisperBinaryResolver: modelo', () => {
  it('when the model exists in the whisper folder, should answer its path', () => {
    const file = path.join(dir, 'ggml-large-v3-turbo.bin');

    expect(resolver('win32', 'x64', [file]).resolveModel(location)).toBe(file);
  });

  it('when the model is configured as a full path elsewhere, should answer that path', () => {
    const model = path.resolve('/modelos/grande.bin');

    expect(resolver('win32', 'x64', [model]).resolveModel({ ...location, model })).toBe(model);
  });

  it('when the model is missing, should answer NOT_CONFIGURED naming the model file', () => {
    const error = thrown(() => resolver('win32', 'x64').resolveModel(location));

    expect(error.code).toBe('NOT_CONFIGURED');
    expect(error.message).toBe(WhisperMessages.modelMissing());
  });

  it('when the platform is unsupported but the model is missing, should still answer NOT_CONFIGURED', () => {
    const error = thrown(() => resolver('darwin', 'arm64').resolveModel(location));

    expect(error.code).toBe('NOT_CONFIGURED');
  });
});
