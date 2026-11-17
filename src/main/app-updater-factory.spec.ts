import * as fs from 'node:fs';
import * as path from 'node:path';

import { makeTempDir, removeDir } from '../settings/settings.testing';

import { createAppUpdater, UPDATES_FOLDER, type AppUpdaterWiring } from './app-updater-factory';

const SHA = 'c'.repeat(64);

const githubRelease = {
  tag_name: 'v0.3.0',
  draft: false,
  prerelease: false,
  body: 'Notas',
  html_url: 'https://github.com/o/r/releases/tag/v0.3.0',
  published_at: '2026-11-01T00:00:00Z',
  assets: [
    {
      name: 'HomeLab-Setup-0.3.0.exe',
      browser_download_url:
        'https://github.com/o/r/releases/download/v0.3.0/HomeLab-Setup-0.3.0.exe',
      size: 3,
      state: 'uploaded',
      digest: `sha256:${SHA}`,
    },
  ],
};

let userData: string;

beforeEach(() => {
  userData = makeTempDir();
});

afterEach(() => removeDir(userData));

function setup(overrides: Partial<AppUpdaterWiring> = {}) {
  /** Os mocks ficam à parte para os testes conferirem as chamadas. */
  const mocks = {
    fetchFn: jest.fn().mockResolvedValue(new Response(JSON.stringify([githubRelease]))),
    spawnDetached: jest.fn(),
    quit: jest.fn(),
    openExternal: jest.fn(),
    publish: jest.fn(),
    notify: jest.fn(),
  };
  const updater = createAppUpdater({
    currentVersion: '0.2.0',
    platform: 'win32',
    userDataDir: userData,
    ...mocks,
    ...overrides,
  });

  return { mocks, updater };
}

describe('createAppUpdater', () => {
  it('when checking, should read the releases of the project from GitHub', async () => {
    const { mocks, updater } = setup();

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

  it('when running on Windows, should be able to install by itself', () => {
    expect(setup({ platform: 'win32' }).updater.status().canInstall).toBe(true);
  });

  it.each(['linux', 'darwin'] as const)(
    'when running on %s, should not install by itself and open the release page instead',
    async (platform) => {
      const { mocks, updater } = setup({ platform });

      await updater.check();
      await updater.install();

      expect(updater.status().canInstall).toBe(false);
      expect(mocks.openExternal).toHaveBeenCalledWith('https://github.com/o/r/releases/tag/v0.3.0');
      expect(mocks.spawnDetached).not.toHaveBeenCalled();
    },
  );

  it('when the update is installed, should download into the updates folder of userData', async () => {
    const download = new Response(Buffer.from('abc'));
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([githubRelease])))
      .mockResolvedValueOnce(download);
    const { updater } = setup({ fetchFn });

    await updater.check();
    const status = await updater.install();

    // O arquivo falso não bate com o checksum: o download é recusado e nada é executado.
    expect(status.error).toMatch(/corrompido/);
    expect(fetchFn).toHaveBeenLastCalledWith(
      'https://github.com/o/r/releases/download/v0.3.0/HomeLab-Setup-0.3.0.exe',
      expect.anything(),
    );
    expect(UPDATES_FOLDER).toBe('updates');
    expect(fs.existsSync(path.join(userData, UPDATES_FOLDER, 'HomeLab-Setup-0.3.0.exe'))).toBe(
      false,
    );
  });
});
