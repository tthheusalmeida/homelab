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
    expectValidation((s) => (s.paths.libraryDir = 'relativa/pasta'), /caminho completo/);
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

  it('when the theme is unknown, should reject', () => {
    expectValidation((s) => (s.appearance.theme = 'sepia' as never), /tema válido/);
  });

  it('when the accent is unknown, should reject', () => {
    expectValidation((s) => (s.appearance.accent = 'brown' as never), /cores de destaque/);
  });

  it('when the reading font is unknown, should reject', () => {
    expectValidation((s) => (s.appearance.reading.font = 'comic' as never), /fontes de leitura/);
  });

  it.each([7, 9, 34, 16.5, '16'])('when the reading font size is %s, should reject', (size) => {
    expectValidation((s) => (s.appearance.reading.fontSize = size as never), /tamanho da letra/);
  });

  it.each([8, 16, 32])('when the reading font size is %s, should accept', (size) => {
    const settings = testDefaults();
    settings.appearance.reading.fontSize = size;

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it.each([60, 105, 210])('when the reading zoom is %s, should reject', (zoom) => {
    expectValidation((s) => (s.appearance.reading.zoom = zoom), /zoom/);
  });

  it.each([70, 100, 200])('when the reading zoom is %s, should accept', (zoom) => {
    const settings = testDefaults();
    settings.appearance.reading.zoom = zoom;

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it('when a reading color is unknown, should reject', () => {
    expectValidation(
      (s) => (s.appearance.reading.background = 'brown' as never),
      /cores de leitura/,
    );
    expectValidation((s) => (s.appearance.reading.text = 'brown' as never), /cores de leitura/);
  });

  it.each([0, 55, 1000])('when a reading intensity is %s, should reject', (shade) => {
    expectValidation(
      (s) => (s.appearance.reading.backgroundShade = shade as never),
      /intensidades/,
    );
    expectValidation((s) => (s.appearance.reading.textShade = shade as never), /intensidades/);
  });

  it.each(['yes', 1, null])('when the side panel option is %j, should reject', (value) => {
    expectValidation((s) => (s.appearance.reading.pinSidebar = value as never), /painel lateral/);
  });

  it('when the side panel is pinned, should accept', () => {
    const settings = testDefaults();
    settings.appearance.reading.pinSidebar = true;

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it.each(['yes', 1, null])('when the transcript preview option is %j, should reject', (value) => {
    expectValidation(
      (s) => (s.appearance.transcript.preview = value as never),
      /opções da transcrição/,
    );
  });

  it.each(['yes', 1, null])('when the transcript progress option is %j, should reject', (value) => {
    expectValidation(
      (s) => (s.appearance.transcript.progress = value as never),
      /opções da transcrição/,
    );
  });

  it.each(['yes', 1, null])('when the summary outline option is %j, should reject', (value) => {
    expectValidation((s) => (s.appearance.summary.outline = value as never), /opções do resumo/);
  });

  it('when the transcript and summary options are turned off, should accept', () => {
    const settings = testDefaults();
    settings.appearance.transcript = { preview: false, progress: false };
    settings.appearance.summary = { outline: false };

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it('when the separator color is unknown, should reject', () => {
    expectValidation(
      (s) => (s.appearance.reading.separator = 'brown' as never),
      /cores de leitura/,
    );
  });

  it('when the separator intensity is invalid, should reject', () => {
    expectValidation((s) => (s.appearance.reading.separatorShade = 55 as never), /intensidades/);
  });

  it('when the separator has a color and an intensity, should accept', () => {
    const settings = testDefaults();
    settings.appearance.reading.separator = 'amber';
    settings.appearance.reading.separatorShade = 300;

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it('when the reading colors are tailwind colors, should accept', () => {
    const settings = testDefaults();
    settings.appearance.reading.background = 'amber';
    settings.appearance.reading.text = 'stone';
    settings.appearance.reading.backgroundShade = 200;
    settings.appearance.reading.textShade = 800;

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it.each(['system', 'light', 'dark'] as const)('when the theme is %s, should accept', (theme) => {
    const settings = testDefaults();
    settings.appearance.theme = theme;

    expect(() => validateSettings(settings)).not.toThrow();
  });

  it('when the automatic update check is not a boolean, should reject', () => {
    expectValidation(
      (s) => ((s.updates as { autoCheck: unknown }).autoCheck = 'sim'),
      /verificação automática/,
    );
  });

  it.each([true, false])('when the automatic update check is %s, should accept', (autoCheck) => {
    const settings = testDefaults();
    settings.updates.autoCheck = autoCheck;

    expect(() => validateSettings(settings)).not.toThrow();
  });
});
