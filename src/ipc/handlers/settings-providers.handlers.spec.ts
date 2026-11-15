import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import type { ExternalProvidersService } from '../../providers/external-providers.service';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import type { SettingsService } from '../../settings/settings.service';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { ExternalProvidersHandler } from './external-providers.handler';
import { LocalProvidersHandler } from './local-providers.handler';
import { SettingsHandler } from './settings.handler';

function register(...handlers: Parameters<IpcRegistrar['register']>[0]) {
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register(handlers);

  return ipc;
}

const picker = (result: string | null = null) => ({ pick: jest.fn().mockResolvedValue(result) });

describe('SettingsHandler', () => {
  const paths = { libraryDir: '/l', inboxDir: '/i', videoTempDir: '/v', audioTempDir: '/a' };

  it('when settings:get is called, should answer the paths from the service', async () => {
    const service = { getPaths: jest.fn().mockReturnValue(paths) } as unknown as SettingsService;
    const ipc = register(new SettingsHandler(service, picker()));

    await expect(ipc.invoke(IpcChannels.settings.get)).resolves.toEqual({ ok: true, data: paths });
  });

  it('when settings:update is called, should pass the patch and answer the save result', async () => {
    const result = { value: paths, restartRequired: true };
    const updatePaths = jest.fn().mockReturnValue(result);
    const ipc = register(
      new SettingsHandler({ updatePaths } as unknown as SettingsService, picker()),
    );

    await expect(ipc.invoke(IpcChannels.settings.update, { libraryDir: '/x' })).resolves.toEqual({
      ok: true,
      data: result,
    });
    expect(updatePaths).toHaveBeenCalledWith({ libraryDir: '/x' });
  });

  it('when the service rejects the patch, should answer VALIDATION', async () => {
    const updatePaths = jest.fn(() => {
      throw new IpcError(IpcErrorCode.VALIDATION, 'Informe a pasta da biblioteca.');
    });
    const ipc = register(
      new SettingsHandler({ updatePaths } as unknown as SettingsService, picker()),
    );

    await expect(ipc.invoke(IpcChannels.settings.update, { libraryDir: '' })).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Informe a pasta da biblioteca.' },
    });
  });
});

describe('SettingsHandler folder picker', () => {
  const service = {} as unknown as SettingsService;

  it('when settings:pick-folder is called, should answer the chosen folder and pass the default path', async () => {
    const folderPicker = picker('D:/escolhida');
    const ipc = register(new SettingsHandler(service, folderPicker));

    await expect(
      ipc.invoke(IpcChannels.settings.pickFolder, { defaultPath: 'D:/atual' }),
    ).resolves.toEqual({ ok: true, data: 'D:/escolhida' });
    expect(folderPicker.pick).toHaveBeenCalledWith('D:/atual');
  });

  it('when the user cancels the dialog, should answer null', async () => {
    const ipc = register(new SettingsHandler(service, picker(null)));

    await expect(ipc.invoke(IpcChannels.settings.pickFolder, {})).resolves.toEqual({
      ok: true,
      data: null,
    });
  });

  it('when called without a payload, should still open the dialog', async () => {
    const folderPicker = picker('D:/x');
    const ipc = register(new SettingsHandler(service, folderPicker));

    await ipc.invoke(IpcChannels.settings.pickFolder);

    expect(folderPicker.pick).toHaveBeenCalledWith(undefined);
  });
});

describe('ExternalProvidersHandler', () => {
  it('when listing, getting, saving and testing, should delegate to the service', async () => {
    const service = {
      list: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ id: 'gemini' }),
      save: jest.fn().mockReturnValue({ restartRequired: true }),
      test: jest.fn().mockResolvedValue({ ok: true, message: 'ok' }),
    };
    const ipc = register(
      new ExternalProvidersHandler(service as unknown as ExternalProvidersService),
    );

    await ipc.invoke(IpcChannels.providers.external.list);
    await ipc.invoke(IpcChannels.providers.external.get, { id: 'gemini' });
    await ipc.invoke(IpcChannels.providers.external.save, { id: 'gemini', apiKey: 'k' });
    await ipc.invoke(IpcChannels.providers.external.test, { id: 'gemini', apiKey: 'k' });

    expect(service.list).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith('gemini');
    expect(service.save).toHaveBeenCalledWith('gemini', 'k');
    expect(service.test).toHaveBeenCalledWith('gemini', 'k');
  });

  it('when the provider does not exist, should answer NOT_FOUND', async () => {
    const service = {
      get: jest.fn(() => {
        throw new IpcError(IpcErrorCode.NOT_FOUND, 'Provider externo não encontrado: x');
      }),
    };
    const ipc = register(
      new ExternalProvidersHandler(service as unknown as ExternalProvidersService),
    );

    await expect(
      ipc.invoke(IpcChannels.providers.external.get, { id: 'x' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('LocalProvidersHandler', () => {
  it('when listing, getting, saving and testing, should delegate to the service', async () => {
    const service = {
      list: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ id: 'ollama' }),
      save: jest.fn().mockReturnValue({ restartRequired: false }),
      test: jest.fn().mockResolvedValue({ ok: true, message: 'ok' }),
    };
    const ipc = register(new LocalProvidersHandler(service as unknown as LocalProvidersService));

    await ipc.invoke(IpcChannels.providers.local.list);
    await ipc.invoke(IpcChannels.providers.local.get, { id: 'ollama' });
    await ipc.invoke(IpcChannels.providers.local.save, { id: 'ollama', config: { url: 'u' } });
    await ipc.invoke(IpcChannels.providers.local.test, { id: 'ollama' });

    expect(service.list).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith('ollama');
    expect(service.save).toHaveBeenCalledWith('ollama', { url: 'u' });
    expect(service.test).toHaveBeenCalledWith('ollama', undefined);
  });

  describe('SettingsHandler appearance', () => {
    it('when appearance:get is called, should answer the current appearance', async () => {
      const appearance = { theme: 'dark', accent: 'blue' };
      const service = {
        getAppearance: jest.fn().mockReturnValue(appearance),
      } as unknown as SettingsService;
      const ipc = register(new SettingsHandler(service, picker()));

      await expect(ipc.invoke(IpcChannels.appearance.get)).resolves.toEqual({
        ok: true,
        data: appearance,
      });
    });

    it('when appearance:update is called, should pass the patch and answer the new appearance', async () => {
      const updateAppearance = jest.fn().mockReturnValue({ theme: 'light', accent: 'cyan' });
      const ipc = register(
        new SettingsHandler({ updateAppearance } as unknown as SettingsService, picker()),
      );

      await expect(ipc.invoke(IpcChannels.appearance.update, { theme: 'light' })).resolves.toEqual({
        ok: true,
        data: { theme: 'light', accent: 'cyan' },
      });
      expect(updateAppearance).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('when the service rejects the accent, should answer VALIDATION', async () => {
      const updateAppearance = jest.fn(() => {
        throw new IpcError(
          IpcErrorCode.VALIDATION,
          'Escolha uma das cores de destaque disponíveis.',
        );
      });
      const ipc = register(
        new SettingsHandler({ updateAppearance } as unknown as SettingsService, picker()),
      );

      await expect(
        ipc.invoke(IpcChannels.appearance.update, { accent: 'x' }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: 'VALIDATION' },
      });
    });
  });
});
