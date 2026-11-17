// Monta o zip dos binários do Windows a partir de resources/bin/win32-x64 (sem modelos nem CUDA)
// e imprime o SHA-256 para o scripts/windows-bin.json. Uso: npm run bin:pack
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isExcludedFromPack, sha256OfFile } from './bin-utils.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'resources', 'bin', 'win32-x64');
const out = path.join(root, 'dist-components');
if (!fs.existsSync(path.join(source, 'whisper-cli.exe')) || !fs.existsSync(path.join(source, 'ffmpeg.exe'))) {
  console.error(`Faltam whisper-cli.exe e/ou ffmpeg.exe em ${source}.`);
  process.exit(1);
}

const files = fs.readdirSync(source, { withFileTypes: true }).filter((e) => e.isFile() && !isExcludedFromPack(e.name));
fs.mkdirSync(out, { recursive: true });
const zip = path.join(out, 'win32-x64.zip');
fs.rmSync(zip, { force: true });
// bsdtar monta o zip (`-a` escolhe o formato pela extensão).
execFileSync('tar', ['-a', '-cf', zip, '-C', source, ...files.map((f) => f.name)], { stdio: 'inherit' });

console.log(`\nPacote: ${zip} (${(fs.statSync(zip).size / 1e6).toFixed(1)} MB, ${files.length} arquivos)`);
console.log(`SHA-256: ${sha256OfFile(zip)}`);
console.log('\nPróximos passos (docs/empacotamento.md):');
console.log('  gh release create bin-v1 --prerelease --title "Binaries v1" --notes "Binários embutidos no instalador."');
console.log(`  gh release upload bin-v1 "${zip}" --clobber`);
console.log('  e preencha url e sha256 em scripts/windows-bin.json.');
