// Verificação local rápida (gancho `pre-push`): roda lint e testes só do que foi alterado ou criado
// em relação à `main`. A suíte completa fica na CI (`.github/workflows/pr.yml`), que barra o merge.
//
// Uso: `npm run check:changed` (o gancho já chama). `CHECK_ALL=1 npm run check:changed` roda tudo,
// o mesmo que `npm run check:all`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Mudou algo que afeta todo o projeto (dependências, config, ganchos): não dá para escolher testes. */
const GLOBAL_FILES = [
  /^package(-lock)?\.json$/,
  /^tsconfig[^/]*\.json$/,
  /^vite[^/]*\.mts$/,
  /^vitest[^/]*\.mts$/,
  /^eslint\.config\.[^/]+$/,
  /^\.eslintrc[^/]*$/,
  /^\.prettierrc[^/]*$/,
  /^jest\.[^/]+$/,
  /^renderer\/vite-aliases\.mts$/,
  /^renderer\/tsconfig\.json$/,
  /^\.husky\//,
  /^scripts\/changed-checks\.mjs$/,
];

/** Passando disso, escolher arquivo a arquivo não compensa (e a linha de comando fica enorme). */
export const MAX_SELECTIVE_FILES = 60;

const isMainSource = (file) => /^src\/.+\.ts$/.test(file) && !file.endsWith('.d.ts');
const isRendererSource = (file) => /^renderer\/.+\.(ts|tsx|mts)$/.test(file);
const isSharedContract = (file) => /^src\/shared\/.+\.ts$/.test(file);

/**
 * Decide o que rodar a partir dos arquivos alterados ou criados.
 * - `lint`: arquivos do `src` (o lint do projeto só cobre `src/**\/*.ts`), ou `'all'`.
 * - `jest` / `vitest`: arquivos para `--findRelatedTests` / `vitest related`, ou `'all'`.
 * - `typecheckRenderer`: o tsc do renderer não escolhe arquivos; roda se o renderer (ou os
 *   contratos que ele importa) mudou.
 */
export function planChecks(files, { all = false } = {}) {
  const everything = { lint: 'all', jest: 'all', vitest: 'all', typecheckRenderer: true };

  if (all) {
    return everything;
  }

  const normalized = [...new Set(files.map((file) => file.replaceAll('\\', '/')))];

  if (normalized.some((file) => GLOBAL_FILES.some((pattern) => pattern.test(file)))) {
    return everything;
  }

  const main = normalized.filter(isMainSource);
  const renderer = normalized.filter(isRendererSource);

  if (main.length + renderer.length > MAX_SELECTIVE_FILES) {
    return everything;
  }

  // Os contratos de `src/shared` também entram no renderer (alias `#shared`).
  const vitest = [...renderer, ...main.filter(isSharedContract)];

  return {
    lint: main.length > 0 ? main : [],
    jest: main.length > 0 ? main : [],
    vitest,
    typecheckRenderer: vitest.length > 0,
  };
}

/** Comandos a executar, em ordem. Cada um é `[programa, ...argumentos]`. */
export function commandsFor(plan) {
  const commands = [];

  if (plan.lint === 'all') {
    commands.push(['npm', 'run', 'lint']);
  } else if (plan.lint.length > 0) {
    commands.push(['npx', 'eslint', ...plan.lint]);
  }

  if (plan.typecheckRenderer) {
    commands.push(['npm', 'run', 'typecheck:renderer']);
  }

  if (plan.jest === 'all') {
    commands.push(['npm', 'test']);
  } else if (plan.jest.length > 0) {
    commands.push(['npx', 'jest', '--findRelatedTests', '--passWithNoTests', ...plan.jest]);
  }

  if (plan.vitest === 'all') {
    commands.push(['npm', 'run', 'test:renderer']);
  } else if (plan.vitest.length > 0) {
    commands.push([
      'npx',
      'vitest',
      'related',
      '--run',
      '--config',
      'vitest.renderer.config.mts',
      '--passWithNoTests',
      ...plan.vitest,
    ]);
  }

  return commands;
}

function git(args) {
  const result = spawnSync('git', ['-c', 'core.quotepath=false', ...args], {
    encoding: 'utf8',
    shell: false,
  });

  return result.status === 0 ? result.stdout.trim() : null;
}

/** Alterados e criados desde a `main` (commits, mudanças ainda não commitadas e arquivos novos). */
export function changedFiles() {
  const base =
    git(['merge-base', 'HEAD', 'origin/main']) ?? git(['merge-base', 'HEAD', 'main']) ?? 'HEAD~1';
  const tracked = git(['diff', '--name-only', '--diff-filter=ACMR', base]) ?? '';
  const untracked = git(['ls-files', '--others', '--exclude-standard']) ?? '';

  return [...tracked.split('\n'), ...untracked.split('\n')].filter((file) => file !== '');
}

function run(command) {
  console.log(`\n> ${command.join(' ')}`);

  return spawnSync(command[0], command.slice(1), { stdio: 'inherit', shell: true }).status === 0;
}

function main() {
  const all = process.env.CHECK_ALL === '1';
  const files = all ? [] : changedFiles();
  const plan = planChecks(files, { all });
  const commands = commandsFor(plan);

  console.log(
    all
      ? 'Verificação completa (CHECK_ALL=1).'
      : `Verificação dos arquivos alterados ou criados (${files.length}); a suíte completa roda na CI antes do merge.`,
  );

  if (commands.length === 0) {
    console.log('Nada de código mudou: nenhum teste a rodar.');
    return;
  }

  for (const command of commands) {
    if (!run(command)) {
      console.error(`\nFalhou: ${command.join(' ')}`);
      process.exit(1);
    }
  }

  console.log('\nVerificação local concluída.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
