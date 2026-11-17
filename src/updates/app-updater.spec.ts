import { AppUpdater, CHECK_INTERVAL_MS, FIRST_CHECK_DELAY_MS, UpdateMessages } from './app-updater';
import type { AppUpdaterDeps, UpdaterTimers } from './app-updater';
import { DownloadMessages } from '../components/downloader';
import type { LatestRelease } from './release-source';

const SHA = 'b'.repeat(64);

const release = (version = '0.3.0', overrides: Partial<LatestRelease> = {}): LatestRelease => ({
  version,
  notes: 'Melhorias',
  url: `https://github.com/owner/repo/releases/tag/v${version}`,
  publishedAt: '2026-11-01T10:00:00Z',
  installer: {
    name: `HomeLab-Setup-${version}.exe`,
    url: 'https://github.com/owner/repo/releases/download/x.exe',
    size: 100,
    sha256: SHA,
  },
  ...overrides,
});

function setup(overrides: Partial<AppUpdaterDeps> = {}, latest: LatestRelease | null = release()) {
  /** Os mocks ficam à parte para os testes poderem trocar o comportamento e conferir as chamadas. */
  const deps = {
    source: { latest: jest.fn().mockResolvedValue(latest) },
    download: jest
      .fn<Promise<string>, [unknown, (percent: number) => void]>()
      .mockResolvedValue('C:/u/updates/HomeLab-Setup-0.3.0.exe'),
    launchInstaller: jest.fn(),
    publish: jest.fn(),
    notifyAvailable: jest.fn(),
    openExternal: jest.fn(),
  };
  const updater = new AppUpdater({
    currentVersion: '0.2.0',
    canInstall: true,
    now: () => 1000,
    ...deps,
    ...overrides,
  });

  return { deps, updater };
}

describe('AppUpdater.status', () => {
  it('when nothing was checked yet, should be idle with the installed version', () => {
    const { updater } = setup();

    expect(updater.status()).toEqual({
      state: 'idle',
      currentVersion: '0.2.0',
      latest: null,
      progress: 0,
      error: null,
      checkedAt: null,
      canInstall: true,
    });
  });
});

describe('AppUpdater.check', () => {
  it('when a newer version exists, should become available with its notes and link', async () => {
    const { updater } = setup();

    const status = await updater.check();

    expect(status).toMatchObject({
      state: 'available',
      checkedAt: 1000,
      error: null,
      latest: {
        version: '0.3.0',
        notes: 'Melhorias',
        url: 'https://github.com/owner/repo/releases/tag/v0.3.0',
      },
    });
  });

  it('when the installed version is the latest, should stay idle without a new version', async () => {
    const { updater } = setup({}, release('0.2.0'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'idle',
      latest: null,
      checkedAt: 1000,
    });
  });

  it('when there is no release at all, should stay idle', async () => {
    const { updater } = setup({}, null);

    await expect(updater.check()).resolves.toMatchObject({ state: 'idle', latest: null });
  });

  it('when checking, should publish the checking state before the result', async () => {
    const { updater, deps } = setup();

    await updater.check();

    const states = deps.publish.mock.calls.map(([status]) => status.state);

    expect(states).toEqual(['checking', 'available']);
  });

  it('when the network fails, should not throw and should say so, keeping the previous state', async () => {
    const { updater, deps } = setup();

    deps.source.latest.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'idle',
      error: UpdateMessages.checkFailed,
    });
  });

  it('when the network fails after a new version was found, should keep it available', async () => {
    const { updater, deps } = setup();

    await updater.check();
    deps.source.latest.mockRejectedValue(new Error('offline'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'available',
      latest: { version: '0.3.0' },
      error: UpdateMessages.checkFailed,
    });
  });

  it('when a new version is found while the app is in the background, should notify once per version', async () => {
    const { updater, deps } = setup();

    await updater.check();
    await updater.check();

    expect(deps.notifyAvailable).toHaveBeenCalledTimes(1);
    expect(deps.notifyAvailable).toHaveBeenCalledWith(
      UpdateMessages.notifyTitle,
      UpdateMessages.notifyBody('0.3.0'),
    );
  });

  it('when a still newer version appears later, should notify again', async () => {
    const { updater, deps } = setup();

    await updater.check();
    deps.source.latest.mockResolvedValue(release('0.4.0'));
    await updater.check();

    expect(deps.notifyAvailable).toHaveBeenCalledTimes(2);
  });

  it('when a check is already running, should not start another', async () => {
    const { updater, deps } = setup();

    await Promise.all([updater.check(), updater.check()]);

    expect(deps.source.latest).toHaveBeenCalledTimes(1);
  });
});

describe('AppUpdater.install', () => {
  it('when there is no new version, should do nothing', async () => {
    const { updater, deps } = setup({}, release('0.2.0'));

    await updater.check();
    await updater.install();

    expect(deps.download).not.toHaveBeenCalled();
    expect(deps.launchInstaller).not.toHaveBeenCalled();
  });

  it('when a new version is available, should download it checked by sha256, then launch the installer', async () => {
    const { updater, deps } = setup();

    await updater.check();
    const status = await updater.install();

    expect(deps.download).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'HomeLab-Setup-0.3.0.exe', sha256: SHA }),
      expect.any(Function),
    );
    expect(deps.launchInstaller).toHaveBeenCalledWith('C:/u/updates/HomeLab-Setup-0.3.0.exe');
    expect(status).toMatchObject({ state: 'installing', progress: 100 });
  });

  it('when downloading, should publish the progress rounded and bounded to 0-100', async () => {
    const { updater, deps } = setup();

    deps.download.mockImplementation(async (_asset, onProgress) => {
      onProgress(33.4);
      onProgress(250);

      return 'file.exe';
    });

    await updater.check();
    await updater.install();

    const downloading = deps.publish.mock.calls
      .map(([status]) => status)
      .filter((status) => status.state === 'downloading')
      .map((status) => status.progress);

    expect(downloading).toEqual(expect.arrayContaining([0, 33, 100]));
    expect(Math.max(...downloading)).toBe(100);
  });

  it('when the download fails, should return to available with the message and allow trying again', async () => {
    const { updater, deps } = setup();

    deps.download.mockRejectedValueOnce(new Error(DownloadMessages.checksum));

    await updater.check();
    await expect(updater.install()).resolves.toMatchObject({
      state: 'available',
      progress: 0,
      error: DownloadMessages.checksum,
    });
    expect(deps.launchInstaller).not.toHaveBeenCalled();

    await expect(updater.install()).resolves.toMatchObject({ state: 'installing', error: null });
  });

  it('when the server answers an error code, should show the download message', async () => {
    const { updater, deps } = setup();

    deps.download.mockRejectedValueOnce(new Error(DownloadMessages.http(404)));

    await updater.check();

    await expect(updater.install()).resolves.toMatchObject({ error: DownloadMessages.http(404) });
  });

  it('when the failure is a system error (disk, permission), should use the generic message', async () => {
    const { updater, deps } = setup();

    deps.download.mockRejectedValueOnce(new Error('EACCES: permission denied, mkdir'));

    await updater.check();

    await expect(updater.install()).resolves.toMatchObject({ error: UpdateMessages.installFailed });
  });

  it('when the failure has no message, should use the generic one', async () => {
    const { updater, deps } = setup();

    deps.download.mockRejectedValueOnce('boom');

    await updater.check();

    await expect(updater.install()).resolves.toMatchObject({ error: UpdateMessages.installFailed });
  });

  it('when the installer cannot be launched, should report it and stay available', async () => {
    const { updater, deps } = setup();

    deps.launchInstaller.mockImplementation(() => {
      throw new Error('EACCES');
    });

    await updater.check();

    await expect(updater.install()).resolves.toMatchObject({
      state: 'available',
      error: UpdateMessages.installFailed,
    });
  });

  it('when the release has no installer for this system, should refuse with a clear message', async () => {
    const { updater, deps } = setup({}, release('0.3.0', { installer: null }));

    await updater.check();

    await expect(updater.install()).resolves.toMatchObject({
      state: 'available',
      error: UpdateMessages.noInstaller,
    });
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('when the installer has no checksum, should refuse instead of installing unchecked', async () => {
    const asset = {
      name: 'HomeLab-Setup-0.3.0.exe',
      url: 'https://github.com/x',
      size: 1,
      sha256: null,
    };
    const { updater, deps } = setup({}, release('0.3.0', { installer: asset }));

    await updater.check();

    await expect(updater.install()).resolves.toMatchObject({ error: UpdateMessages.noChecksum });
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('when the app cannot install by itself (not Windows), should open the release page instead', async () => {
    const { updater, deps } = setup({ canInstall: false });

    await updater.check();
    const status = await updater.install();

    expect(deps.openExternal).toHaveBeenCalledWith(
      'https://github.com/owner/repo/releases/tag/v0.3.0',
    );
    expect(deps.download).not.toHaveBeenCalled();
    expect(status.state).toBe('available');
  });

  it('when an install is already running, should not start a second one', async () => {
    const { updater, deps } = setup();
    let finish: (file: string) => void = () => undefined;

    deps.download.mockReturnValue(new Promise<string>((resolve) => (finish = resolve)));

    await updater.check();
    const first = updater.install();
    const second = await updater.install();

    expect(second.state).toBe('downloading');
    finish('file.exe');
    await first;
    expect(deps.download).toHaveBeenCalledTimes(1);
  });

  it('when installing, should not let a new check interrupt it', async () => {
    const { updater, deps } = setup();
    let finish: (file: string) => void = () => undefined;

    deps.download.mockReturnValue(new Promise<string>((resolve) => (finish = resolve)));

    await updater.check();
    const running = updater.install();

    await updater.check();
    expect(deps.source.latest).toHaveBeenCalledTimes(1);

    finish('file.exe');
    await running;
  });
});

describe('AppUpdater scheduling', () => {
  function fakeTimers() {
    const calls: Array<{ kind: string; run: () => void; ms: number }> = [];
    const cleared: unknown[] = [];
    const timers: UpdaterTimers = {
      setTimeout: (run, ms) => calls.push({ kind: 'timeout', run, ms }) && `t${calls.length}`,
      setInterval: (run, ms) => calls.push({ kind: 'interval', run, ms }) && `i${calls.length}`,
      clear: (handle) => cleared.push(handle),
    };

    return { calls, cleared, timers };
  }

  it('when started, should check shortly after opening and then every 6 hours', async () => {
    const { calls, timers } = fakeTimers();
    const { updater, deps } = setup({ timers });

    updater.start();

    expect(calls.map(({ kind, ms }) => [kind, ms])).toEqual([
      ['timeout', FIRST_CHECK_DELAY_MS],
      ['interval', CHECK_INTERVAL_MS],
    ]);

    calls[0].run();
    await Promise.resolve();

    expect(deps.source.latest).toHaveBeenCalledTimes(1);
  });

  it('when stopped, should clear both timers', () => {
    const { cleared, timers } = fakeTimers();
    const { updater } = setup({ timers });

    updater.start();
    updater.stop();

    expect(cleared).toHaveLength(2);
  });
});
