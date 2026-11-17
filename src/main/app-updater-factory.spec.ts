import type { NativeUpdater } from '../updates/native-updater';

import { createAppUpdater, type AppUpdaterWiring } from './app-updater-factory';

const githubRelease = {
  tag_name: 'v0.3.0',
  draft: false,
  prerelease: false,
  body: 'Notas',
  html_url: 'https://github.com/o/r/releases/tag/v0.3.0',
  published_at: '2026-11-01T00:00:00Z',
};

function makeNative(): jest.Mocked<NativeUpdater> {
  return {
    prepare: jest.fn().mockResolvedValue(true),
    download: jest.fn().mockResolvedValue(undefined),
    quitAndInstall: jest.fn(),
  };
}

function setup(overrides: Partial<AppUpdaterWiring> = {}) {
  /** Os mocks ficam à parte para os testes conferirem as chamadas. */
  const mocks = {
    fetchFn: jest.fn().mockResolvedValue(new Response(JSON.stringify([githubRelease]))),
    getAutoCheck: jest.fn().mockReturnValue(true),
    saveAutoCheck: jest.fn(),
    openExternal: jest.fn(),
    publish: jest.fn(),
    notify: jest.fn(),
  };
  const native = makeNative();
  const updater = createAppUpdater({
    currentVersion: '0.2.0',
    enabled: true,
    native,
    ...mocks,
    ...overrides,
  });

  return { mocks, native, updater };
}

describe('createAppUpdater', () => {
  it('when checking, should read the releases of the project from GitHub', async () => {
    const { mocks, updater } = setup({ native: null });

    const status = await updater.check();

    expect(mocks.fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/repos/'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(status).toMatchObject({ state: 'available', latest: { version: '0.3.0' } });
  });

  it('when GitHub answers an error, should keep the app calm and report the failure', async () => {
    const { updater } = setup({
      fetchFn: jest.fn().mockResolvedValue(new Response('rate limit', { status: 403 })),
    });

    await expect(updater.check()).resolves.toMatchObject({
      state: 'idle',
      error: expect.stringContaining('verificar'),
    });
  });

  it('when a native updater is given, should install by itself and download the difference', async () => {
    const { native, updater } = setup();

    const status = await updater.check();

    expect(updater.status().canInstall).toBe(true);
    expect(native.prepare).toHaveBeenCalledWith('0.3.0');
    expect(status.state).toBe('ready');
  });

  it('when there is no native updater, should not install by itself and open the release page instead', async () => {
    const { mocks, updater } = setup({ native: null });

    await updater.check();
    await updater.install();

    expect(updater.status().canInstall).toBe(false);
    expect(mocks.openExternal).toHaveBeenCalledWith('https://github.com/o/r/releases/tag/v0.3.0');
  });

  it('when the preference is read and saved, should go through the given functions', () => {
    const { mocks, updater } = setup();

    expect(updater.status().autoCheck).toBe(true);
    updater.setAutoCheck(false);

    expect(mocks.saveAutoCheck).toHaveBeenCalledWith(false);
  });
});
