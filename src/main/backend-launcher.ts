import * as fs from 'node:fs';

import { MainEnv, Messages } from './constants';
import { resolveBackEntry } from './paths';

type Env = Record<string, string | undefined>;

export interface BackendLauncherDeps {
  env: Env;
  chdir: (dir: string) => void;
  load: (entry: string) => unknown;
  exists?: (file: string) => boolean;
}

/**
 * Sobe o Nest do `back` dentro do processo main: ajusta a origem de CORS,
 * entra na pasta do back (de onde o `.env` é lido) e carrega o `dist/main.js`.
 * O Nest vive e morre junto com o app, então fechar a janela libera a porta.
 */
export class BackendLauncher {
  private readonly exists: (file: string) => boolean;

  constructor(private readonly deps: BackendLauncherDeps) {
    this.exists = deps.exists ?? fs.existsSync;
  }

  start(backDir: string, corsOrigin: string): void {
    const entry = resolveBackEntry(backDir);

    if (!this.exists(entry)) {
      throw new Error(Messages.backendEntryMissing);
    }

    this.deps.env[MainEnv.CORS_ORIGIN] = corsOrigin;
    this.deps.chdir(backDir);
    this.deps.load(entry);
  }
}
