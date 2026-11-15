import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  checkOverrides,
  describeProblems,
  OVERRIDES_LOCK_FILE,
  refreshLock,
  type OverridesLock,
} from './overrides-lock';

const desktopRoot = path.resolve(__dirname, '..', '..');
const frontDir = process.env.HOMELAB_FRONT_DIR ?? path.resolve(desktopRoot, '..', 'front');
const lockPath = path.join(desktopRoot, OVERRIDES_LOCK_FILE);

const readFile = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
const readLock = () => JSON.parse(fs.readFileSync(lockPath, 'utf8')) as OverridesLock;

const command = process.argv[2];

if (command === 'update') {
  const updated = refreshLock(readLock(), frontDir, readFile);

  fs.writeFileSync(lockPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Hashes atualizados (${Object.keys(updated).length} arquivo(s)).`);
} else if (command === 'check') {
  const problems = describeProblems(checkOverrides(readLock(), frontDir, readFile));

  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }

  console.log('Cópias do desktop em dia com o front.');
} else {
  console.error('Uso: node dist/overrides/cli.js <check|update>');
  process.exit(2);
}
