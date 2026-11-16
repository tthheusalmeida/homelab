import { browserFromDesktopFile, browserFromProgId, detectDefaultBrowser } from './default-browser';

const reg = (progId: string) =>
  `\r\nHKEY_CURRENT_USER\\...\\UserChoice\r\n    ProgId    REG_SZ    ${progId}\r\n`;

describe('browserFromProgId', () => {
  it.each([
    ['ChromeHTML', 'chrome'],
    ['MSEdgeHTM', 'edge'],
    ['FirefoxURL-308046B0AF4A39CB', 'firefox'],
    ['BraveHTML', 'brave'],
  ])('when the ProgId is %s, should return %s', (progId, name) => {
    expect(browserFromProgId(progId)).toBe(name);
  });

  it('when the ProgId is unknown, should return null', () => {
    expect(browserFromProgId('AppX123')).toBeNull();
  });
});

describe('browserFromDesktopFile', () => {
  it.each([
    ['google-chrome.desktop\n', 'chrome'],
    ['chromium_chromium.desktop', 'chromium'],
    ['firefox_firefox.desktop', 'firefox'],
    ['brave-browser.desktop', 'brave'],
    ['microsoft-edge.desktop', 'edge'],
    ['vivaldi-stable.desktop', 'vivaldi'],
  ])('when the desktop file is %s, should return %s', (file, name) => {
    expect(browserFromDesktopFile(file)).toBe(name);
  });

  it('when the desktop file is unknown, should return null', () => {
    expect(browserFromDesktopFile('epiphany.desktop')).toBeNull();
  });
});

describe('detectDefaultBrowser', () => {
  it('when the default browser is Chrome on Windows, should return chrome', async () => {
    const run = jest.fn().mockResolvedValue(reg('ChromeHTML'));

    await expect(detectDefaultBrowser('win32', run)).resolves.toBe('chrome');
    expect(run).toHaveBeenCalledWith('reg', expect.arrayContaining(['query']));
  });

  it('when the default browser is Firefox on Linux, should ask xdg-settings and return firefox', async () => {
    const run = jest.fn().mockResolvedValue('firefox_firefox.desktop\n');

    await expect(detectDefaultBrowser('linux', run)).resolves.toBe('firefox');
    expect(run).toHaveBeenCalledWith('xdg-settings', ['get', 'default-web-browser']);
  });

  it('when on macOS, should not run anything', async () => {
    const run = jest.fn();

    await expect(detectDefaultBrowser('darwin', run)).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('when xdg-settings is missing on Linux, should return null', async () => {
    await expect(
      detectDefaultBrowser('linux', async () => {
        throw new Error('ENOENT');
      }),
    ).resolves.toBeNull();
  });

  it('when reading the registry fails, should return null', async () => {
    await expect(
      detectDefaultBrowser('win32', async () => {
        throw new Error('no key');
      }),
    ).resolves.toBeNull();
  });
});
