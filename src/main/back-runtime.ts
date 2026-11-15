import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

import { Messages } from './constants';
import { resolveBackEntry } from './paths';

/**
 * Carrega pacotes e módulos **a partir do back** (`back/node_modules` e `back/dist`),
 * para que o Nest e as classes do back sejam as mesmas instâncias (duas cópias do
 * Nest quebrariam a injeção de dependência). O back não é alterado.
 */
export class BackRuntime {
  private readonly load: (id: string) => unknown;

  constructor(
    private readonly backDir: string,
    exists: (file: string) => boolean = fs.existsSync,
  ) {
    const entry = resolveBackEntry(backDir);

    if (!exists(entry)) {
      throw new Error(Messages.backendEntryMissing);
    }

    this.load = createRequire(entry);
  }

  /** Pacote npm resolvido a partir do back (ex.: `@nestjs/core`). */
  pkg<T>(name: string): T {
    return this.load(name) as T;
  }

  /** Módulo compilado do back (ex.: `modules/ai/ai.module`). */
  module<T>(relativePath: string): T {
    return this.load(path.join(this.backDir, 'dist', relativePath)) as T;
  }
}
