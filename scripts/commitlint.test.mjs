// Confere a config do commitlint contra mensagens válidas e inválidas: `npm run test:commitlint`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lint = require('@commitlint/lint').default;
const load = require('@commitlint/load').default;
const config = require('../commitlint.config.cjs');

const check = async (message) => {
  const loaded = await load(config);
  return lint(message, loaded.rules, { parserOpts: loaded.parserPreset?.parserOpts });
};

const valid = [
  'feat: add chat export',
  'fix(jobs): keep progress after restart',
  'perf: load screens on demand',
  'feat!: drop the old settings file',
  'docs: explain the release flow\n\nBody with a link https://example.com/very/long/url/that/goes/past/one/hundred/characters/for/sure/yes',
  'chore: bump deps\n\nCo-Authored-By: Someone <a@b.c>',
];
const invalid = [
  ['arrumei coisa', 'sem tipo'],
  ['Added x', 'sem tipo'],
  ['feat:x', 'sem espaço depois dos dois pontos'],
  ['FEAT: x', 'tipo em maiúsculas'],
  ['feature: x', 'tipo fora da lista'],
  ['feat: ', 'descrição vazia'],
  ['feat: add a very long description that goes well past the seventy two character limit', 'primeira linha longa'],
  ['fix: correct x.', 'ponto final'],
];

for (const message of valid) {
  test(`when the message is "${message.split('\n')[0]}", should pass`, async () => {
    const result = await check(message);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  });
}
for (const [message, reason] of invalid) {
  test(`when the message is "${message}" (${reason}), should fail`, async () => {
    const result = await check(message);
    assert.equal(result.valid, false);
  });
}
