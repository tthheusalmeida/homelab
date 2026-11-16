import { browserFromProgId, detectDefaultBrowser } from './default-browser';

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

describe('detectDefaultBrowser', () => {
  it('when the default browser is Chrome on Windows, should return chrome', async () => {
    await expect(detectDefaultBrowser('win32', async () => reg('ChromeHTML'))).resolves.toBe(
      'chrome',
    );
  });

  it('when not on Windows, should not read the registry', async () => {
    const query = jest.fn();

    await expect(detectDefaultBrowser('linux', query)).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('when reading the registry fails, should return null', async () => {
    await expect(
      detectDefaultBrowser('win32', async () => {
        throw new Error('no key');
      }),
    ).resolves.toBeNull();
  });
});
