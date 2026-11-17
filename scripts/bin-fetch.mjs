// Baixa o pacote de binários do Windows e extrai em resources/bin/win32-x64 (usado pela CI).
// Uso: node scripts/bin-fetch.mjs
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { downloadVerified } from './bin-utils.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'windows-bin.json'), 'utf8'));
if (!lock.url || !lock.sha256) {
  console.error(
    'scripts/windows-bin.json está sem url e sha256. Gere o pacote com `npm run bin:pack`, publique no ' +
      'Release bin-v1 e preencha o arquivo (docs/empacotamento.md).',
  );
  process.exit(1);
}

const target = path.join(root, 'resources', 'bin', 'win32-x64');
const zip = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'homelab-bin-')), 'win32-x64.zip');
await downloadVerified(lock.url, lock.sha256, zip);
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
// `tar` (bsdtar) vem no Windows 10+ e no runner windows-latest e lê .zip.
execFileSync('tar', ['-xf', zip, '-C', target], { stdio: 'inherit' });
for (const required of ['whisper-cli.exe', 'ffmpeg.exe']) {
  if (!fs.existsSync(path.join(target, required))) {
    console.error(`O pacote não trouxe ${required}.`);
    process.exit(1);
  }
}
console.log(`Binários extraídos em ${target}`);
