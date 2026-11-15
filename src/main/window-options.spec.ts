import { createWindowOptions } from './window-options';

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
