import { windowBackground } from './constants';
import { createSplashWindowOptions, createWindowOptions } from './window-options';

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

describe('windowBackground', () => {
  it('when the system theme is dark, should use the charcoal background', () => {
    expect(windowBackground(true)).toBe('#1b1b1b');
  });

  it('when the system theme is light, should use the light gray background', () => {
    expect(windowBackground(false)).toBe('#f1f1f1');
  });

  it('when a background is given, should paint the main window with it', () => {
    expect(createWindowOptions('/p.js', '#f1f1f1').backgroundColor).toBe('#f1f1f1');
  });
});

describe('createSplashWindowOptions', () => {
  const options = createSplashWindowOptions('#1b1b1b');

  it('when creating the splash, should be a small frameless window out of the taskbar', () => {
    expect(options).toMatchObject({
      frame: false,
      resizable: false,
      skipTaskbar: true,
      center: true,
      width: 340,
      height: 240,
    });
  });

  it('when creating the splash, should start hidden until its first paint', () => {
    expect(options.show).toBe(false);
  });

  it('when creating the splash, should use the given background and keep the renderer isolated', () => {
    expect(options.backgroundColor).toBe('#1b1b1b');
    expect(options.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    });
  });

  it('when creating the splash, should not load a preload script', () => {
    expect(options.webPreferences?.preload).toBeUndefined();
  });
});
