import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { BackConfig } from '../config/back-config';
import { LibraryStorage } from '../modules/library/infrastructure/library-storage';

export interface TmpLibrary {
  root: string;
  lib: string;
  inbox: string;
  storage: LibraryStorage;
  cleanup: () => void;
}

/** Biblioteca em pasta temporária do SO, para testes com arquivos reais. */
export function createTmpLibrary(): TmpLibrary {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'library-spec-'));
  const lib = path.join(root, 'lib');
  const inbox = path.join(root, 'docs');

  const storage = new LibraryStorage({ libraryDir: lib, inboxDir: inbox } as BackConfig);

  return {
    root,
    lib,
    inbox,
    storage,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}
