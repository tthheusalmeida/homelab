import { createSettingsWindowOptions, createWindowOptions } from './window-options';

describe('createWindowOptions', () => {
  const options = createWindowOptions('/app/preload.js');

  it('when creating the window, should isolate the renderer from Node', () => {
    expect(options.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    });
  });

  it('when creating the window, should use the given preload script', () => {
    expect(options.webPreferences?.preload).toBe('/app/preload.js');
  });

  it('when creating the window, should start hidden until ready to show', () => {
    expect(options.show).toBe(false);
  });
});

describe('createSettingsWindowOptions', () => {
  const options = createSettingsWindowOptions('/app/preload.js');

  it('when creating the settings window, should apply the same security flags', () => {
    expect(options.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: '/app/preload.js',
    });
  });

  it('when creating the settings window, should be titled Configurações and start hidden with the dark background', () => {
    expect(options).toMatchObject({
      title: 'Configurações',
      show: false,
      backgroundColor: '#0a0a0a',
    });
  });
});
