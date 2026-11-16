import { PlatformSessionMessages, PlatformSessions } from './platform-sessions';
import type { CookieLike } from './netscape-cookies';

const COOKIE: CookieLike = { name: 'sid', value: 'abc', domain: '.curso.edu' };

function build(cookies: CookieLike[] = [COOKIE], saved: CookieLike[] = cookies) {
  const deps = {
    readSession: jest.fn().mockResolvedValue(cookies),
    restoreSession: jest.fn().mockResolvedValue(undefined),
    loadSaved: jest.fn().mockResolvedValue(saved),
    saveCookies: jest.fn().mockResolvedValue(undefined),
    openWindow: jest.fn().mockResolvedValue(undefined),
    tempDir: 'C:\\tmp',
    writeFile: jest.fn().mockResolvedValue(undefined),
    removeFile: jest.fn().mockResolvedValue(undefined),
    now: () => 1_800_000_000_000,
  };

  return { sessions: new PlatformSessions(deps), deps };
}

describe('PlatformSessions.openLogin', () => {
  it('when the user signs in and closes the window, should report access granted', async () => {
    const { sessions, deps } = build();

    await expect(sessions.openLogin('https://aulas.curso.edu/video/1')).resolves.toBe(true);
    expect(deps.openWindow).toHaveBeenCalledWith(
      'https://aulas.curso.edu/video/1',
      PlatformSessionMessages.windowTitle,
    );
  });

  it('when the user signs in, should save the logins so the next time is automatic', async () => {
    const { sessions, deps } = build([COOKIE], []);

    await sessions.openLogin('https://aulas.curso.edu/video/1');

    expect(deps.saveCookies).toHaveBeenCalledWith([COOKIE]);
  });

  it('when there are saved logins, should restore them into the window before opening it', async () => {
    const { sessions, deps } = build([COOKIE], [COOKIE]);

    await sessions.openLogin('https://aulas.curso.edu/video/1');

    expect(deps.restoreSession).toHaveBeenCalledWith([COOKIE]);
    expect(deps.restoreSession.mock.invocationCallOrder[0]).toBeLessThan(
      deps.openWindow.mock.invocationCallOrder[0],
    );
  });

  it('when the window closes with no cookies from that site, should report access not granted', async () => {
    const { sessions } = build([{ name: 'x', value: 'y', domain: '.outro.com' }]);

    await expect(sessions.openLogin('https://aulas.curso.edu/video/1')).resolves.toBe(false);
  });

  it('when the link is not http or https, should refuse without opening a window', async () => {
    const { sessions, deps } = build();

    await expect(sessions.openLogin('file:///C:/x')).rejects.toThrow(
      PlatformSessionMessages.invalidUrl,
    );
    expect(deps.openWindow).not.toHaveBeenCalled();
  });
});

describe('PlatformSessions.cookiesFor', () => {
  it('when the user never signed in anywhere, should return null and write nothing', async () => {
    const { sessions, deps } = build([], []);

    await expect(sessions.cookiesFor()).resolves.toBeNull();
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('when there are cookies, should write a Netscape file in the temp dir', async () => {
    const { sessions, deps } = build();

    const result = await sessions.cookiesFor();

    expect(result?.file).toMatch(/cookies-1800000000000-1\.txt$/);
    expect(deps.writeFile).toHaveBeenCalledWith(
      result?.file,
      expect.stringContaining('.curso.edu\tTRUE\t/\tFALSE\t'),
    );
  });

  it('when the download is over, should delete the temporary file', async () => {
    const { sessions, deps } = build();
    const result = await sessions.cookiesFor();

    await result?.cleanup();

    expect(deps.removeFile).toHaveBeenCalledWith(result?.file);
  });

  it('when two downloads ask at the same time, should use different files', async () => {
    const { sessions } = build();
    const [first, second] = await Promise.all([sessions.cookiesFor(), sessions.cookiesFor()]);

    expect(first?.file).not.toBe(second?.file);
  });
});
