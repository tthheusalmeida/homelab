import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { createDefaultSettings } from './settings-defaults';

/** Pasta temporária do SO para testes; remova com `fs.rmSync(dir, { recursive: true })`. */
export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'homelab-desktop-'));
}

export function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

export const testDefaults = () =>
  createDefaultSettings({ libraryDir: path.resolve('/data/library') });
