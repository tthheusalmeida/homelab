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
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    pickFolder: 'settings:pick-folder',
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
