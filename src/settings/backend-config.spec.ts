import { BackendConfigKey, DesktopAppConfig } from './backend-config';
import { testDefaults } from './settings.testing';

describe('DesktopAppConfig', () => {
  const settings = testDefaults();
  const config = new DesktopAppConfig(settings, 'app://front');

  it.each([
    [BackendConfigKey.LIB_DIR, settings.paths.libraryDir],
    [BackendConfigKey.TEMP_DOCS_DIR, settings.paths.inboxDir],
    [BackendConfigKey.TEMP_VIDEO_DIR, settings.paths.videoTempDir],
    [BackendConfigKey.TEMP_AUDIO_DIR, settings.paths.audioTempDir],
    [BackendConfigKey.WHISPER_DIR, settings.local.whisper.directory],
    [BackendConfigKey.WHISPER_EXECUTABLE, settings.local.whisper.executable],
    [BackendConfigKey.WHISPER_MODEL, settings.local.whisper.model],
    [BackendConfigKey.OLLAMA_URL, settings.local.ollama.url],
    [BackendConfigKey.CORS_ORIGIN, 'app://front'],
  ])('when the back asks for %s, should answer the value from the settings', (key, expected) => {
    expect(config.get(key)).toBe(expected);
  });

  it('when the back asks for an unknown key, should throw naming it', () => {
    expect(() => config.get('OUTRA_COISA')).toThrow(/OUTRA_COISA/);
  });
});
