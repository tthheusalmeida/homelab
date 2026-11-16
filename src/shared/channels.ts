/**
 * Todos os canais IPC do app. Formato `<domínio>:<ação>`.
 * Main, preload e front importam daqui; nenhum canal aparece como string solta.
 * Os canais dos demais domínios entram junto com os handlers de cada fase
 * (ver docs/ipc-canais.md).
 */
export const IpcChannels = {
  app: {
    ping: 'app:ping',
    version: 'app:version',
    relaunch: 'app:relaunch',
    openSettings: 'app:open-settings',
    settingsSection: 'app:settings-section',
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    pickFolder: 'settings:pick-folder',
    inspectLibrary: 'settings:inspect-library',
    moveLibrary: 'settings:move-library',
  },
  appearance: {
    get: 'appearance:get',
    update: 'appearance:update',
  },
  health: {
    system: 'health:system',
    ai: 'health:ai',
  },
  ai: {
    providers: 'ai:providers',
    models: 'ai:models',
    thinking: 'ai:thinking',
    usage: 'ai:usage',
  },
  backup: {
    preview: 'backup:preview',
    create: 'backup:create',
    cancel: 'backup:cancel',
    inspect: 'backup:inspect',
    restore: 'backup:restore',
  },
  notices: {
    pending: 'notices:pending',
  },
  components: {
    status: 'components:status',
    install: 'components:install',
    cancel: 'components:cancel',
    remove: 'components:remove',
    setActiveModel: 'components:set-active-model',
  },
  chat: {
    send: 'chat:send',
    cancel: 'chat:cancel',
  },
  chats: {
    list: 'chats:list',
    get: 'chats:get',
    delete: 'chats:delete',
  },
  library: {
    documents: {
      list: 'library:documents:list',
      get: 'library:documents:get',
      createArticle: 'library:documents:create-article',
      publish: 'library:documents:publish',
      update: 'library:documents:update',
      suggest: 'library:documents:suggest',
      archive: 'library:documents:archive',
      delete: 'library:documents:delete',
    },
    inbox: 'library:inbox',
    categories: 'library:categories',
    tags: 'library:tags',
    index: 'library:index',
    reindex: 'library:reindex',
    books: {
      list: 'library:books:list',
      get: 'library:books:get',
      read: 'library:books:read',
      search: 'library:books:search',
      create: 'library:books:create',
      update: 'library:books:update',
      delete: 'library:books:delete',
      setStructure: 'library:books:set-structure',
      addChapter: 'library:books:add-chapter',
      markChapterRead: 'library:books:mark-chapter-read',
      resetProgress: 'library:books:reset-progress',
      setPosition: 'library:books:set-position',
    },
  },
  jobs: {
    list: 'jobs:list',
    types: 'jobs:types',
    get: 'jobs:get',
    createVideoToTranscript: 'jobs:create-video-to-transcript',
    createVideoToSummary: 'jobs:create-video-to-summary',
    delete: 'jobs:delete',
    deleteAll: 'jobs:delete-all',
    undoDelete: 'jobs:undo-delete',
    cancel: 'jobs:cancel',
    retry: 'jobs:retry',
    grantAccess: 'jobs:grant-access',
  },
  platform: {
    forgetLogins: 'platform:forget-logins',
  },
  providers: {
    external: {
      list: 'providers:external:list',
      get: 'providers:external:get',
      save: 'providers:external:save',
      test: 'providers:external:test',
    },
    local: {
      list: 'providers:local:list',
      get: 'providers:local:get',
      save: 'providers:local:save',
      test: 'providers:local:test',
    },
  },
} as const;

type Values<T> = T extends string ? T : { [K in keyof T]: Values<T[K]> }[keyof T];

export type IpcChannel = Values<typeof IpcChannels>;

function collect(node: unknown, found: string[]): string[] {
  if (typeof node === 'string') {
    found.push(node);
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((child) => collect(child, found));
  }

  return found;
}

/** Lista plana de todos os canais declarados (base da lista permitida no preload). */
export function allChannels(): IpcChannel[] {
  return collect(IpcChannels, []) as IpcChannel[];
}

export const CHANNEL_FORMAT = /^[a-z]+(:[a-z]+(-[a-z]+)*)+$/;
