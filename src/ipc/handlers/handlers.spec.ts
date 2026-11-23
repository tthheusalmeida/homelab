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
        appInfo: {
          version: () => '0.0.1',
          relaunch: jest.fn(),
          openSettings: jest.fn(),
          revealFile: jest.fn(),
          takeSettingsSection: jest.fn(),
          restartPending: jest.fn(),
          markRestartPending: jest.fn(),
        },
        folderPicker: { pick: jest.fn() },
        libraryMover: { inspect: jest.fn(), apply: jest.fn() },
        notices: { drain: jest.fn() },
        components: {
          status: jest.fn(),
          install: jest.fn(),
          cancel: jest.fn(),
          remove: jest.fn(),
          setActiveModel: jest.fn(),
        },
        updates: {
          status: jest.fn(),
          check: jest.fn(),
          install: jest.fn(),
          setAutoCheck: jest.fn(),
        },
        notesTranslator: { available: jest.fn(), translate: jest.fn() },
        backup: {
          preview: jest.fn(),
          create: jest.fn(),
          cancel: jest.fn(),
          inspect: jest.fn(),
          restore: jest.fn(),
        },
        pdf: { inspect: jest.fn(), cancel: jest.fn() },
        settings: {} as SettingsService,
        externalProviders: {} as ExternalProvidersService,
        localProviders: {} as LocalProvidersService,
        platformLogin: { openLogin: jest.fn() },
        platformLogins: { forgetLogins: jest.fn() },
        mindMapImages: { save: jest.fn() },
        back: {
          healthSystem: { check: jest.fn() },
          healthAi: { check: jest.fn() },
          ai: { providersList: jest.fn(), models: jest.fn(), thinking: jest.fn() },
          aiUsage: { getUsage: jest.fn() },
          chat: {
            send: jest.fn(),
            cancel: jest.fn(),
            list: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
          },
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
            renameCategory: jest.fn(),
            createCategory: jest.fn(),
            deleteCategory: jest.fn(),
          },
          libraryClassifier: { suggest: jest.fn() },
          mindMaps: { get: jest.fn(), generate: jest.fn(), save: jest.fn(), delete: jest.fn() },
          infographics: { get: jest.fn(), generate: jest.fn(), save: jest.fn(), delete: jest.fn() },
          prompts: { overview: jest.fn(), save: jest.fn(), delete: jest.fn(), activate: jest.fn() },
          jobs: {
            catalog: { list: jest.fn(), get: jest.fn(), listTypes: jest.fn() },
            launcher: {
              startVideoToTranscript: jest.fn(),
              startVideoToSummary: jest.fn(),
              startPdfToSummary: jest.fn(),
              retry: jest.fn(),
            },
            deleter: { deleteMany: jest.fn(), deleteAll: jest.fn(), undoDelete: jest.fn() },
            canceller: { cancel: jest.fn() },
            leftovers: { scan: jest.fn(), clean: jest.fn() },
          },
          books: {
            list: jest.fn(),
            get: jest.fn(),
            read: jest.fn(),
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
