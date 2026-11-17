import { AppUpdater, CHECK_INTERVAL_MS, FIRST_CHECK_DELAY_MS, UpdateMessages } from './app-updater';
import type { AppUpdaterDeps, UpdaterTimers } from './app-updater';
import type { LatestRelease } from './release-source';

const release = (version = '0.3.0'): LatestRelease => ({
  version,
  notes: 'Melhorias',
  url: `https://github.com/owner/repo/releases/tag/v${version}`,
  publishedAt: '2026-11-01T10:00:00Z',
});

function makeNative() {
  return {
    prepare: jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true),
    download: jest.fn<Promise<void>, [(percent: number) => void]>().mockResolvedValue(undefined),
    quitAndInstall: jest.fn(),
  };
}

interface SetupOptions {
  latest?: LatestRelease | null;
  /** `false` simula Linux, macOS ou app não empacotado (sem atualizador nativo). */
  withNative?: boolean;
  autoCheck?: boolean;
  timers?: UpdaterTimers;
}

function setup({
  latest = release(),
  withNative = true,
  autoCheck = true,
  timers,
}: SetupOptions = {}) {
  /** Os mocks ficam à parte para os testes poderem trocar o comportamento e conferir as chamadas. */
  const native = makeNative();
  let autoCheckValue = autoCheck;
  const deps = {
    source: { latest: jest.fn().mockResolvedValue(latest) },
    getAutoCheck: jest.fn(() => autoCheckValue),
    saveAutoCheck: jest.fn((value: boolean) => {
      autoCheckValue = value;
    }),
    publish: jest.fn(),
    notify: jest.fn(),
    openExternal: jest.fn(),
  };
  const config: AppUpdaterDeps = {
    currentVersion: '0.2.0',
    native: withNative ? native : null,
    now: () => 1000,
    timers,
    ...deps,
  };

  return { deps, native, updater: new AppUpdater(config) };
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
      autoCheck: true,
    });
  });

  it('when there is no native updater, should say it cannot install by itself', () => {
    expect(setup({ withNative: false }).updater.status().canInstall).toBe(false);
  });
});

describe('AppUpdater.check', () => {
  it('when the installed version is the latest, should stay idle without a new version', async () => {
    const { updater, native } = setup({ latest: release('0.2.0') });

    await expect(updater.check()).resolves.toMatchObject({
      state: 'idle',
      latest: null,
      checkedAt: 1000,
    });
    expect(native.prepare).not.toHaveBeenCalled();
  });

  it('when there is no release at all, should stay idle', async () => {
    const { updater } = setup({ latest: null });

    await expect(updater.check()).resolves.toMatchObject({ state: 'idle', latest: null });
  });

  it('when the network fails, should not throw and should say so, keeping the previous state', async () => {
    const { updater, deps } = setup();

    deps.source.latest.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'idle',
      error: UpdateMessages.checkFailed,
    });
  });

  it('when the network fails after a version is ready, should not even look at the network', async () => {
    const { updater, deps } = setup();

    await updater.check();
    deps.source.latest.mockRejectedValue(new Error('offline'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'ready',
      error: null,
      latest: { version: '0.3.0' },
    });
    expect(deps.source.latest).toHaveBeenCalledTimes(1);
  });

  it('when a check is already running, should not start another', async () => {
    const { updater, deps } = setup();

    await Promise.all([updater.check(), updater.check()]);

    expect(deps.source.latest).toHaveBeenCalledTimes(1);
  });

  it('when a new version exists on Windows, should publish checking, available, downloading and ready in order', async () => {
    const { updater, deps } = setup();

    await updater.check();

    const states = deps.publish.mock.calls.map(([status]) => status.state);

    expect(states).toEqual(['checking', 'available', 'downloading', 'ready']);
  });
});

describe('AppUpdater automatic download (native updater)', () => {
  it('when a newer version exists, should download only the difference by itself and become ready', async () => {
    const { updater, native } = setup();

    const status = await updater.check();

    expect(native.prepare).toHaveBeenCalledWith('0.3.0');
    expect(native.download).toHaveBeenCalledTimes(1);
    expect(status).toMatchObject({
      state: 'ready',
      progress: 100,
      error: null,
      checkedAt: 1000,
      latest: {
        version: '0.3.0',
        notes: 'Melhorias',
        url: 'https://github.com/owner/repo/releases/tag/v0.3.0',
      },
    });
  });

  it('when the download progresses, should publish the progress rounded and bounded to 0-100', async () => {
    const { updater, deps, native } = setup();

    native.download.mockImplementation(async (onProgress) => {
      onProgress(33.4);
      onProgress(250);
      onProgress(-5);
    });

    await updater.check();

    const downloading = deps.publish.mock.calls
      .map(([status]) => status)
      .filter((status) => status.state === 'downloading')
      .map((status) => status.progress);

    expect(downloading).toEqual(expect.arrayContaining([0, 33, 100]));
    expect(Math.min(...downloading)).toBe(0);
    expect(Math.max(...downloading)).toBe(100);
  });

  it('when the version becomes ready, should notify once, saying it will install on restart', async () => {
    const { updater, deps } = setup();

    await updater.check();
    await updater.check();

    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenCalledWith(
      UpdateMessages.readyTitle,
      UpdateMessages.readyBody('0.3.0'),
    );
  });

  it('when the download fails, should return to available with a message and keep the new version', async () => {
    const { updater, native } = setup();

    native.download.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_RESET'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'available',
      progress: 0,
      error: UpdateMessages.installFailed,
      latest: { version: '0.3.0' },
    });
  });

  it('when the release has no update files (latest.yml), should refuse with a clear message and not download', async () => {
    const { updater, native } = setup();

    native.prepare.mockResolvedValue(false);

    await expect(updater.check()).resolves.toMatchObject({
      state: 'available',
      error: UpdateMessages.noInstaller,
    });
    expect(native.download).not.toHaveBeenCalled();
  });

  it('when the update files cannot be read (network or parse error), should return to available with the generic message', async () => {
    const { updater, native } = setup();

    native.prepare.mockRejectedValue(new Error('Cannot find latest.yml'));

    await expect(updater.check()).resolves.toMatchObject({
      state: 'available',
      error: UpdateMessages.installFailed,
    });
  });

  it('when a new check finds the same version after a failed download, should try the download again', async () => {
    const { updater, native } = setup();

    native.download.mockRejectedValueOnce(new Error('boom'));
    await updater.check();

    await expect(updater.check()).resolves.toMatchObject({ state: 'ready', error: null });
    expect(native.download).toHaveBeenCalledTimes(2);
  });
});

describe('AppUpdater.install', () => {
  it('when there is no new version, should do nothing', async () => {
    const { updater, native } = setup({ latest: release('0.2.0') });

    await updater.check();
    await updater.install();

    expect(native.download).not.toHaveBeenCalled();
    expect(native.quitAndInstall).not.toHaveBeenCalled();
  });

  it('when the version is ready, should restart and install', async () => {
    const { updater, native } = setup();

    await updater.check();
    const status = await updater.install();

    expect(native.quitAndInstall).toHaveBeenCalledTimes(1);
    expect(status.state).toBe('installing');
  });

  it('when the automatic download had failed, should download again and become ready without restarting', async () => {
    const { updater, native } = setup();

    native.download.mockRejectedValueOnce(new Error('boom'));
    await updater.check();

    const status = await updater.install();

    expect(status).toMatchObject({ state: 'ready', error: null });
    expect(native.download).toHaveBeenCalledTimes(2);
    expect(native.quitAndInstall).not.toHaveBeenCalled();
  });

  it('when installing is asked while it is already downloading, should not start a second download', async () => {
    const { updater, native } = setup();
    let finish: () => void = () => undefined;

    native.download.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const checking = updater.check();

    await new Promise((resolve) => setImmediate(resolve));

    const second = await updater.install();

    expect(second.state).toBe('downloading');
    finish();
    await checking;
    expect(native.download).toHaveBeenCalledTimes(1);
  });

  it('when downloading, should not let a new check interrupt it', async () => {
    const { updater, native, deps } = setup();
    let finish: () => void = () => undefined;

    native.download.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const running = updater.check();

    await new Promise((resolve) => setImmediate(resolve));
    await updater.check();

    expect(deps.source.latest).toHaveBeenCalledTimes(1);
    finish();
    await running;
  });
});

describe('AppUpdater without a native updater (Linux, macOS, not packaged)', () => {
  it('when a newer version exists, should only become available and notify, without downloading', async () => {
    const { updater, deps, native } = setup({ withNative: false });

    const status = await updater.check();

    expect(status).toMatchObject({ state: 'available', latest: { version: '0.3.0' } });
    expect(native.prepare).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledWith(
      UpdateMessages.notifyTitle,
      UpdateMessages.notifyBody('0.3.0'),
    );
  });

  it('when installing, should open the release page instead', async () => {
    const { updater, deps } = setup({ withNative: false });

    await updater.check();
    const status = await updater.install();

    expect(deps.openExternal).toHaveBeenCalledWith(
      'https://github.com/owner/repo/releases/tag/v0.3.0',
    );
    expect(status.state).toBe('available');
  });

  it('when a still newer version appears later, should notify again', async () => {
    const { updater, deps } = setup({ withNative: false });

    await updater.check();
    await updater.check();
    deps.source.latest.mockResolvedValue(release('0.4.0'));
    await updater.check();

    expect(deps.notify).toHaveBeenCalledTimes(2);
  });
});

describe('AppUpdater.setAutoCheck', () => {
  it('when turned off, should save the preference, publish it and report it in the status', () => {
    const { updater, deps } = setup();

    const status = updater.setAutoCheck(false);

    expect(deps.saveAutoCheck).toHaveBeenCalledWith(false);
    expect(status.autoCheck).toBe(false);
    expect(deps.publish).toHaveBeenCalledWith(expect.objectContaining({ autoCheck: false }));
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

    calls[1].run();
    await new Promise((resolve) => setImmediate(resolve));

    expect(deps.source.latest.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('when the automatic check is off, should not check on the timers', async () => {
    const { calls, timers } = fakeTimers();
    const { updater, deps } = setup({ timers, autoCheck: false });

    updater.start();
    calls.forEach(({ run }) => run());
    await new Promise((resolve) => setImmediate(resolve));

    expect(deps.source.latest).not.toHaveBeenCalled();
  });

  it('when the automatic check is off, should still check when the user asks', async () => {
    const { updater, deps } = setup({ autoCheck: false });

    await updater.check();

    expect(deps.source.latest).toHaveBeenCalledTimes(1);
  });

  it('when the automatic check is turned on after the app started, should check on the next timer', async () => {
    const { calls, timers } = fakeTimers();
    const { updater, deps } = setup({ timers, autoCheck: false });

    updater.start();
    updater.setAutoCheck(true);
    calls[0].run();
    await new Promise((resolve) => setImmediate(resolve));

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
