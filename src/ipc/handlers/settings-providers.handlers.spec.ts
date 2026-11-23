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
const mover = () => ({ inspect: jest.fn(), apply: jest.fn() });

describe('SettingsHandler', () => {
  const paths = { libraryDir: '/l', inboxDir: '/i', videoTempDir: '/v', audioTempDir: '/a' };

  it('when settings:get is called, should answer the paths from the service', async () => {
    const service = { getPaths: jest.fn().mockReturnValue(paths) } as unknown as SettingsService;
    const ipc = register(new SettingsHandler(service, picker(), mover()));

    await expect(ipc.invoke(IpcChannels.settings.get)).resolves.toEqual({ ok: true, data: paths });
  });

  it('when settings:update is called, should pass the patch and answer the save result', async () => {
    const result = { value: paths, restartRequired: true };
    const updatePaths = jest.fn().mockReturnValue(result);
    const ipc = register(
      new SettingsHandler({ updatePaths } as unknown as SettingsService, picker(), mover()),
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
      new SettingsHandler({ updatePaths } as unknown as SettingsService, picker(), mover()),
    );

    await expect(ipc.invoke(IpcChannels.settings.update, { libraryDir: '' })).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Informe a pasta da biblioteca.' },
    });
  });
});

describe('SettingsHandler library folder', () => {
  const service = {} as unknown as SettingsService;

  it('when settings:inspect-library is called, should pass the path and answer what the mover found', async () => {
    const info = { path: 'D:/nova', exists: false, empty: true, fileCount: 0 };
    const library = { inspect: jest.fn().mockResolvedValue(info), apply: jest.fn() };
    const ipc = register(new SettingsHandler(service, picker(), library));

    await expect(
      ipc.invoke(IpcChannels.settings.inspectLibrary, { path: 'D:/nova' }),
    ).resolves.toEqual({ ok: true, data: info });
    expect(library.inspect).toHaveBeenCalledWith('D:/nova');
  });

  it('when settings:move-library is called, should pass the whole request and answer the result', async () => {
    const result = {
      libraryDir: 'D:/nova',
      filesCopied: 3,
      bytesCopied: 10,
      originRemoved: false,
      restartRequired: true,
    };
    const library = { inspect: jest.fn(), apply: jest.fn().mockResolvedValue(result) };
    const ipc = register(new SettingsHandler(service, picker(), library));
    const request = { to: 'D:/nova', mode: 'move', deleteOrigin: true };

    await expect(ipc.invoke(IpcChannels.settings.moveLibrary, request)).resolves.toEqual({
      ok: true,
      data: result,
    });
    expect(library.apply).toHaveBeenCalledWith(request);
  });

  it('when the mover fails to copy, should answer the PERSIST_FAILED code and message', async () => {
    const library = {
      inspect: jest.fn(),
      apply: jest.fn().mockRejectedValue(new IpcError(IpcErrorCode.PERSIST_FAILED, 'Disco cheio')),
    };
    const ipc = register(new SettingsHandler(service, picker(), library));

    await expect(
      ipc.invoke(IpcChannels.settings.moveLibrary, { to: 'D:/nova', mode: 'move' }),
    ).resolves.toEqual({ ok: false, error: { code: 'PERSIST_FAILED', message: 'Disco cheio' } });
  });
});

describe('SettingsHandler folder picker', () => {
  const service = {} as unknown as SettingsService;

  it('when settings:pick-folder is called, should answer the chosen folder and pass the default path', async () => {
    const folderPicker = picker('D:/escolhida');
    const ipc = register(new SettingsHandler(service, folderPicker, mover()));

    await expect(
      ipc.invoke(IpcChannels.settings.pickFolder, { defaultPath: 'D:/atual' }),
    ).resolves.toEqual({ ok: true, data: 'D:/escolhida' });
    expect(folderPicker.pick).toHaveBeenCalledWith('D:/atual');
  });

  it('when the user cancels the dialog, should answer null', async () => {
    const ipc = register(new SettingsHandler(service, picker(null), mover()));

    await expect(ipc.invoke(IpcChannels.settings.pickFolder, {})).resolves.toEqual({
      ok: true,
      data: null,
    });
  });

  it('when called without a payload, should still open the dialog', async () => {
    const folderPicker = picker('D:/x');
    const ipc = register(new SettingsHandler(service, folderPicker, mover()));

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

  describe('SettingsHandler support', () => {
    it('when support:get is called, should answer the saved choice', async () => {
      const getSupport = jest.fn().mockReturnValue({ starPromptHidden: false });
      const ipc = register(
        new SettingsHandler({ getSupport } as unknown as SettingsService, picker(), mover()),
      );

      await expect(ipc.invoke(IpcChannels.support.get)).resolves.toEqual({
        ok: true,
        data: { starPromptHidden: false },
      });
    });

    it('when support:update is called, should pass the patch and answer the new choice', async () => {
      const updateSupport = jest.fn().mockReturnValue({ starPromptHidden: true });
      const ipc = register(
        new SettingsHandler({ updateSupport } as unknown as SettingsService, picker(), mover()),
      );

      await expect(
        ipc.invoke(IpcChannels.support.update, { starPromptHidden: true }),
      ).resolves.toEqual({ ok: true, data: { starPromptHidden: true } });
      expect(updateSupport).toHaveBeenCalledWith({ starPromptHidden: true });
    });
  });

  describe('SettingsHandler AI default', () => {
    it('when ai:default-update is called, should save the preference and answer what was kept', async () => {
      const preference = { providerId: 'anthropic' as const, modelId: null };
      const updateAiDefault = jest.fn().mockReturnValue(preference);
      const ipc = register(
        new SettingsHandler({ updateAiDefault } as unknown as SettingsService, picker(), mover()),
      );

      await expect(ipc.invoke(IpcChannels.ai.defaultUpdate, { preference })).resolves.toEqual({
        ok: true,
        data: preference,
      });
      expect(updateAiDefault).toHaveBeenCalledWith(preference);
    });

    it('when ai:default-update clears the default, should pass null', async () => {
      const updateAiDefault = jest.fn().mockReturnValue(null);
      const ipc = register(
        new SettingsHandler({ updateAiDefault } as unknown as SettingsService, picker(), mover()),
      );

      await ipc.invoke(IpcChannels.ai.defaultUpdate, { preference: null });

      expect(updateAiDefault).toHaveBeenCalledWith(null);
    });
  });

  describe('SettingsHandler appearance', () => {
    it('when appearance:get is called, should answer the current appearance', async () => {
      const appearance = { theme: 'dark', accent: 'blue' };
      const service = {
        getAppearance: jest.fn().mockReturnValue(appearance),
      } as unknown as SettingsService;
      const ipc = register(new SettingsHandler(service, picker(), mover()));

      await expect(ipc.invoke(IpcChannels.appearance.get)).resolves.toEqual({
        ok: true,
        data: appearance,
      });
    });

    it('when appearance:update is called, should pass the patch and answer the new appearance', async () => {
      const updateAppearance = jest.fn().mockReturnValue({ theme: 'light', accent: 'cyan' });
      const ipc = register(
        new SettingsHandler({ updateAppearance } as unknown as SettingsService, picker(), mover()),
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
        new SettingsHandler({ updateAppearance } as unknown as SettingsService, picker(), mover()),
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
