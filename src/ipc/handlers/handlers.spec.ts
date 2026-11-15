import type { ExternalProvidersService } from '../../providers/external-providers.service';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import { allChannels } from '../../shared/channels';
import type { SettingsService } from '../../settings/settings.service';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { createHandlers } from './index';

describe('createHandlers', () => {
  it('when all handlers are registered, should cover every channel declared in IpcChannels', () => {
    const ipc = new FakeIpcMain();

    new IpcRegistrar(ipc).register(
      createHandlers({
        appInfo: { version: () => '0.0.1', relaunch: jest.fn(), openSettings: jest.fn() },
        folderPicker: { pick: jest.fn() },
        settings: {} as SettingsService,
        externalProviders: {} as ExternalProvidersService,
        localProviders: {} as LocalProvidersService,
        back: {
          healthSystem: { check: jest.fn() },
          healthAi: { check: jest.fn() },
          ai: { providersList: jest.fn(), models: jest.fn(), thinking: jest.fn() },
          aiUsage: { getUsage: jest.fn() },
          chat: { chat: jest.fn() },
          library: {
            list: jest.fn(),
            inbox: jest.fn(),
            get: jest.fn(),
            categories: jest.fn(),
            tags: jest.fn(),
            indexStatus: jest.fn(),
            reindex: jest.fn(),
            createArticle: jest.fn(),
            publish: jest.fn(),
            update: jest.fn(),
            archive: jest.fn(),
            discard: jest.fn(),
          },
          libraryClassifier: { suggest: jest.fn() },
          books: {
            list: jest.fn(),
            get: jest.fn(),
            read: jest.fn(),
            search: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setStructure: jest.fn(),
            addChapter: jest.fn(),
            setChapterRead: jest.fn(),
            resetProgress: jest.fn(),
            saveLastPosition: jest.fn(),
          },
        },
      }),
    );

    expect([...ipc.channels()].sort()).toEqual([...allChannels()].sort());
  });
});
