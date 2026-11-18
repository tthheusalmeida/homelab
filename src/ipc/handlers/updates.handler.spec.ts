import { IpcChannels } from '../../shared/channels';
import type { UpdateStatus } from '../../shared/contracts/updates';
import { IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { TranslationUnavailableError } from '../../updates/release-notes-translator';

import { UpdatesHandler, UpdatesHandlerMessages } from './updates.handler';

const status = (overrides: Partial<UpdateStatus> = {}): UpdateStatus => ({
  state: 'idle',
  currentVersion: '0.2.0',
  latest: null,
  progress: 0,
  error: null,
  checkedAt: null,
  enabled: true,
  canInstall: true,
  autoCheck: true,
  ...overrides,
});

function setup() {
  const ipc = new FakeIpcMain();
  const updates = {
    status: jest.fn().mockReturnValue(status()),
    check: jest.fn().mockResolvedValue(status({ checkedAt: 1 })),
    install: jest.fn().mockResolvedValue(status({ state: 'installing' })),
    setAutoCheck: jest.fn((autoCheck: boolean) => status({ autoCheck })),
  };
  const translator = {
    available: jest.fn().mockResolvedValue(true),
    translate: jest.fn().mockResolvedValue('## Novidades'),
  };

  new IpcRegistrar(ipc).register([new UpdatesHandler(updates, translator)]);

  return { ipc, updates, translator };
}

describe('UpdatesHandler', () => {
  it('when updates:status is called, should answer the current status', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.updates.status)).resolves.toEqual({
      ok: true,
      data: status(),
    });
  });

  it('when updates:check is called, should check now and answer the new status', async () => {
    const { ipc, updates } = setup();

    await expect(ipc.invoke(IpcChannels.updates.check)).resolves.toEqual({
      ok: true,
      data: status({ checkedAt: 1 }),
    });
    expect(updates.check).toHaveBeenCalledTimes(1);
  });

  it('when updates:install is called, should install or download and answer the status', async () => {
    const { ipc, updates } = setup();

    await expect(ipc.invoke(IpcChannels.updates.install)).resolves.toMatchObject({
      ok: true,
      data: { state: 'installing' },
    });
    expect(updates.install).toHaveBeenCalledTimes(1);
  });

  it('when updates:set-auto-check receives a boolean, should save it and answer the status', async () => {
    const { ipc, updates } = setup();

    await expect(
      ipc.invoke(IpcChannels.updates.setAutoCheck, { autoCheck: false }),
    ).resolves.toEqual({ ok: true, data: status({ autoCheck: false }) });
    expect(updates.setAutoCheck).toHaveBeenCalledWith(false);
  });

  it('when updates:set-auto-check receives something else, should answer a validation error', async () => {
    const { ipc, updates } = setup();

    await expect(
      ipc.invoke(IpcChannels.updates.setAutoCheck, { autoCheck: 'yes' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.VALIDATION, message: UpdatesHandlerMessages.autoCheckInvalid },
    });
    await expect(ipc.invoke(IpcChannels.updates.setAutoCheck)).resolves.toMatchObject({
      ok: false,
    });
    expect(updates.setAutoCheck).not.toHaveBeenCalled();
  });

  it('when the updater fails, should answer a failed envelope instead of rejecting', async () => {
    const ipc = new FakeIpcMain();
    const updates = {
      status: jest.fn(),
      check: jest.fn().mockRejectedValue(new Error('sem rede')),
      install: jest.fn(),
      setAutoCheck: jest.fn(),
    };

    new IpcRegistrar(ipc).register([
      new UpdatesHandler(updates, { available: jest.fn(), translate: jest.fn() }),
    ]);

    await expect(ipc.invoke(IpcChannels.updates.check)).resolves.toMatchObject({ ok: false });
  });
});

const availableStatus = () =>
  status({
    state: 'available',
    latest: {
      version: '0.3.0',
      notes: '## Novidades\n\n- feat: faster reading',
      url: 'https://github.com/o/r/releases/tag/v0.3.0',
      publishedAt: null,
    },
  });

describe('UpdatesHandler notes translation', () => {
  it('when updates:translation-available is called, should say whether the local AI can translate', async () => {
    const { ipc, translator } = setup();

    await expect(ipc.invoke(IpcChannels.updates.translationAvailable)).resolves.toEqual({
      ok: true,
      data: { available: true },
    });

    translator.available.mockResolvedValueOnce(false);

    await expect(ipc.invoke(IpcChannels.updates.translationAvailable)).resolves.toEqual({
      ok: true,
      data: { available: false },
    });
  });

  it('when updates:translate-notes is called, should translate the notes the app already knows, never text from the renderer', async () => {
    const { ipc, updates, translator } = setup();

    updates.status.mockReturnValue(availableStatus());

    await expect(ipc.invoke(IpcChannels.updates.translateNotes)).resolves.toEqual({
      ok: true,
      data: { version: '0.3.0', notes: '## Novidades' },
    });
    expect(translator.translate).toHaveBeenCalledWith(
      '0.3.0',
      '## Novidades\n\n- feat: faster reading',
    );
  });

  it('when there is no new version, should answer a validation error without calling the model', async () => {
    const { ipc, translator } = setup();

    const result = await ipc.invoke(IpcChannels.updates.translateNotes);

    expect(result).toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.VALIDATION, message: UpdatesHandlerMessages.noNotes },
    });
    expect(translator.translate).not.toHaveBeenCalled();
  });

  it('when the local AI is off, should answer NOT_CONFIGURED', async () => {
    const { ipc, updates, translator } = setup();

    updates.status.mockReturnValue(availableStatus());
    translator.translate.mockRejectedValueOnce(new TranslationUnavailableError());

    await expect(ipc.invoke(IpcChannels.updates.translateNotes)).resolves.toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.NOT_CONFIGURED },
    });
  });

  it('when the model fails, should answer PROVIDER_FAILED with the generic message', async () => {
    const { ipc, updates, translator } = setup();

    updates.status.mockReturnValue(availableStatus());
    translator.translate.mockRejectedValueOnce(new Error('timeout interno'));

    const result = await ipc.invoke(IpcChannels.updates.translateNotes);

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.PROVIDER_FAILED } });
    expect(JSON.stringify(result)).not.toContain('timeout interno');
  });
});
