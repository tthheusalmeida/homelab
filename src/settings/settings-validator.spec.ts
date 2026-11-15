import * as path from 'node:path';

import { IpcError } from '../shared/errors';

import { validateSettings } from './settings-validator';
import { testDefaults } from './settings.testing';

function expectValidation(mutate: (s: ReturnType<typeof testDefaults>) => void, message: RegExp) {
  const settings = testDefaults();
  mutate(settings);

  try {
    validateSettings(settings);
    throw new Error('should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(IpcError);
    expect(error).toMatchObject({ code: 'VALIDATION' });
    expect((error as Error).message).toMatch(message);
  }
}

describe('validateSettings', () => {
  it('when the settings are the defaults, should accept', () => {
    expect(() => validateSettings(testDefaults())).not.toThrow();
  });

  it('when a folder is blank, should reject asking to inform it', () => {
    expectValidation((s) => (s.paths.libraryDir = '  '), /Informe a pasta da biblioteca/);
  });

  it('when a folder is relative, should reject asking for a full path', () => {
    expectValidation((s) => (s.paths.inboxDir = 'relativa/pasta'), /caminho completo/);
  });

  it('when the whisper folder is relative, should reject', () => {
    expectValidation((s) => (s.local.whisper.directory = 'whisper'), /pasta do Whisper/);
  });

  it('when the whisper model includes a folder, should reject asking for only the file name', () => {
    expectValidation(
      (s) => (s.local.whisper.model = path.join('sub', 'modelo.bin')),
      /só o nome do arquivo/,
    );
  });

  it('when the whisper executable is blank, should reject', () => {
    expectValidation((s) => (s.local.whisper.executable = ''), /executável do Whisper/);
  });

  it('when the ollama url is not a valid http(s) address, should reject', () => {
    expectValidation((s) => (s.local.ollama.url = 'localhost:11434'), /URL do Ollama/);
    expectValidation((s) => (s.local.ollama.url = 'ftp://x'), /URL do Ollama/);
    expectValidation((s) => (s.local.ollama.url = 'nao-e-url'), /URL do Ollama/);
  });

  it('when the ollama url is https, should accept', () => {
    const settings = testDefaults();
    settings.local.ollama.url = 'https://ollama.exemplo.com';

    expect(() => validateSettings(settings)).not.toThrow();
  });
});
