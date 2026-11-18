// Confere a escolha dos testes do gancho pre-push: `npm run test:release`.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { commandsFor, MAX_SELECTIVE_FILES, planChecks } from './changed-checks.mjs';

test('when only a main file changes, should lint and run Jest on it and skip the renderer', () => {
  const plan = planChecks(['src/back/modules/jobs/job.entity.ts']);

  assert.deepEqual(plan, {
    lint: ['src/back/modules/jobs/job.entity.ts'],
    jest: ['src/back/modules/jobs/job.entity.ts'],
    vitest: [],
    typecheckRenderer: false,
  });
});

test('when only a renderer file changes, should run Vitest on it and the renderer typecheck, no Jest', () => {
  const plan = planChecks(['renderer/src/pages/jobs/create/components/LinkList.tsx']);

  assert.deepEqual(plan.lint, []);
  assert.deepEqual(plan.jest, []);
  assert.deepEqual(plan.vitest, ['renderer/src/pages/jobs/create/components/LinkList.tsx']);
  assert.equal(plan.typecheckRenderer, true);
});

test('when a new test file is created, should run that test', () => {
  const plan = planChecks(['renderer/src/lib/inbox-text.test.ts', 'src/back/utils/retry.spec.ts']);

  assert.deepEqual(plan.vitest, ['renderer/src/lib/inbox-text.test.ts']);
  assert.deepEqual(plan.jest, ['src/back/utils/retry.spec.ts']);
});

test('when a shared contract changes, should also run the renderer tests that import it', () => {
  const plan = planChecks(['src/shared/contracts/jobs.ts']);

  assert.deepEqual(plan.jest, ['src/shared/contracts/jobs.ts']);
  assert.deepEqual(plan.vitest, ['src/shared/contracts/jobs.ts']);
  assert.equal(plan.typecheckRenderer, true);
});

test('when only docs or non-code files change, should run nothing', () => {
  const plan = planChecks(['docs/versionamento.md', 'README.md', 'resources/bin/README.md']);

  assert.deepEqual(plan, { lint: [], jest: [], vitest: [], typecheckRenderer: false });
  assert.deepEqual(commandsFor(plan), []);
});

test('when a declaration file changes, should not treat it as a main source', () => {
  assert.deepEqual(planChecks(['src/types/global.d.ts']).jest, []);
});

test('when no file changed, should run nothing', () => {
  assert.deepEqual(commandsFor(planChecks([])), []);
});

for (const file of [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.renderer.json',
  'vitest.renderer.config.mts',
  'vite.renderer.main.config.mts',
  'renderer/vite-aliases.mts',
  'eslint.config.mjs',
  '.husky/pre-push',
  'scripts/changed-checks.mjs',
]) {
  test(`when ${file} changes, should run everything because it affects the whole project`, () => {
    assert.deepEqual(planChecks([file, 'src/a.ts']), {
      lint: 'all',
      jest: 'all',
      vitest: 'all',
      typecheckRenderer: true,
    });
  });
}

test('when CHECK_ALL is requested, should run everything even with no change', () => {
  assert.equal(planChecks([], { all: true }).jest, 'all');
});

test('when too many files changed, should run everything instead of listing them', () => {
  const files = Array.from({ length: MAX_SELECTIVE_FILES + 1 }, (_, i) => `src/a${i}.ts`);

  assert.equal(planChecks(files).jest, 'all');
});

test('when exactly the limit of files changed, should still select by file', () => {
  const files = Array.from({ length: MAX_SELECTIVE_FILES }, (_, i) => `src/a${i}.ts`);

  assert.equal(planChecks(files).jest.length, MAX_SELECTIVE_FILES);
});

test('when Windows paths are given, should normalize the separators', () => {
  assert.deepEqual(planChecks(['src\\back\\a.ts']).jest, ['src/back/a.ts']);
});

test('when the same file shows up twice, should list it once', () => {
  assert.deepEqual(planChecks(['src/a.ts', 'src/a.ts']).jest, ['src/a.ts']);
});

test('when building commands for a main and renderer change, should lint, typecheck, then test only the related files', () => {
  const commands = commandsFor(planChecks(['src/a.ts', 'renderer/src/b.tsx']));

  assert.deepEqual(commands, [
    ['npx', 'eslint', 'src/a.ts'],
    ['npm', 'run', 'typecheck:renderer'],
    ['npx', 'jest', '--findRelatedTests', '--passWithNoTests', 'src/a.ts'],
    [
      'npx',
      'vitest',
      'related',
      '--run',
      '--config',
      'vitest.renderer.config.mts',
      '--passWithNoTests',
      'renderer/src/b.tsx',
    ],
  ]);
});

test('when everything must run, should use the full npm scripts', () => {
  assert.deepEqual(commandsFor(planChecks([], { all: true })), [
    ['npm', 'run', 'lint'],
    ['npm', 'run', 'typecheck:renderer'],
    ['npm', 'test'],
    ['npm', 'run', 'test:renderer'],
  ]);
});
