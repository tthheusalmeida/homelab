// Lê o git, decide se há release e escreve as saídas para o GitHub Actions.
// Uso: node scripts/release/plan.mjs [--notes <arquivo>]
// Variáveis: GITHUB_REPOSITORY, GITHUB_OUTPUT (opcional; sem ele só imprime).
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';

import { latestVersionTag, planRelease } from './conventional.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const tags = git('tag', '--list').split('\n').filter(Boolean);
const latest = latestVersionTag(tags);
const range = latest ? `${latest.tag}..HEAD` : 'HEAD';
const messages = git('log', range, '--no-merges', '--format=%H%x1f%B%x1e')
  .split('\x1e')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [hash, ...message] = entry.split('\x1f');
    return { hash, message: message.join('\x1f') };
  });

const plan = planRelease({
  tags,
  messages,
  repository: process.env.GITHUB_REPOSITORY ?? 'tthheusalmeida/homelab',
});

const notesIndex = process.argv.indexOf('--notes');
if (plan.release && notesIndex > -1) fs.writeFileSync(process.argv[notesIndex + 1], plan.notes);

const outputs = plan.release
  ? { release: 'true', version: plan.version, tag: plan.tag, bump: plan.bump }
  : { release: 'false' };
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([k, v]) => `${k}=${v}\n`).join(''));
}

console.log(plan.release ? `Release ${plan.tag} (${plan.bump}) desde ${plan.previousTag || 'o início'}\n\n${plan.notes}` : `Sem release: ${plan.reason}`);
