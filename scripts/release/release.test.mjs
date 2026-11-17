// `npm run test:release`: versão e changelog a partir dos commits.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNotes,
  decideBump,
  latestVersionTag,
  parseCommit,
  planRelease,
} from './conventional.mjs';

const repository = 'owner/repo';
const msg = (message, hash = 'a'.repeat(40)) => ({ hash, message });
const plan = (messages, tags = ['v0.2.0']) => planRelease({ tags, messages, repository });

test('when the header follows the convention, should parse type, scope and subject', () => {
  const commit = parseCommit('fix(jobs): keep progress (#12)', 'abc');
  assert.deepEqual(
    { type: commit.type, scope: commit.scope, subject: commit.subject, pr: commit.pr, breaking: commit.breaking },
    { type: 'fix', scope: 'jobs', subject: 'keep progress', pr: '12', breaking: false },
  );
});

test('when the header is not a conventional commit, should return null', () => {
  assert.equal(parseCommit('Updated things'), null);
  assert.equal(parseCommit('feat:no space'), null);
});

test('when the type has "!" or the body has BREAKING CHANGE, should mark as breaking', () => {
  assert.equal(parseCommit('feat!: drop old file').breaking, true);
  assert.equal(parseCommit('fix: x\n\nBREAKING CHANGE: format changed').breaking, true);
});

test('when the tags mix app versions and component releases, should pick the highest vX.Y.Z', () => {
  const latest = latestVersionTag(['components-v1', 'bin-v1', 'v0.1.1', 'v0.10.0', 'v0.2.0', 'v1']);
  assert.equal(latest.tag, 'v0.10.0');
});

test('when there are no version tags, should return null', () => {
  assert.equal(latestVersionTag(['components-v1']), null);
});

test('when a feat is present, should bump the minor', () => {
  const result = plan([msg('fix: a'), msg('feat: b')]);
  assert.equal(result.tag, 'v0.3.0');
  assert.equal(result.bump, 'minor');
});

test('when only a fix is present, should bump the patch', () => {
  assert.equal(plan([msg('fix: a'), msg('docs: b')]).tag, 'v0.2.1');
});

test('when there is a breaking change on 0.x, should bump the minor', () => {
  assert.equal(plan([msg('fix!: a')]).tag, 'v0.3.0');
});

test('when there is a breaking change on 1.x or later, should bump the major', () => {
  assert.equal(plan([msg('feat!: a')], ['v1.4.2']).tag, 'v2.0.0');
});

test('when only docs, chore, ci, test, refactor or perf commits exist, should not release', () => {
  const result = plan(
    ['docs: a', 'chore: b', 'ci: c', 'test: d', 'refactor: e', 'perf: f', 'build: g'].map((m) => msg(m)),
  );
  assert.equal(result.release, false);
});

test('when commits are not conventional, should ignore them', () => {
  assert.equal(plan([msg('random text')]).release, false);
});

test('when there is no previous tag, should start from 0.0.0', () => {
  assert.equal(plan([msg('feat: first')], []).tag, 'v0.1.0');
});

test('when waiting commits exist, should list them in the notes of the next release', () => {
  const { notes } = plan([msg('docs: explain flow'), msg('perf: faster list'), msg('feat: chat export (#7)')]);
  assert.match(notes, /## Novidades\n\n- chat export \(\[#7\]/);
  assert.match(notes, /## Desempenho\n\n- faster list/);
  assert.match(notes, /Outras mudanças \(1\)/);
  assert.match(notes, /explain flow/);
  assert.match(notes, /compare\/v0\.2\.0\.\.\.v0\.3\.0/);
});

test('when a breaking change exists, should put it in its own section first', () => {
  const { notes } = plan([msg('feat: a'), msg('fix!: b')]);
  assert.ok(notes.indexOf('quebram') < notes.indexOf('Novidades'));
});

test('when a commit has a scope and no PR, should link its short hash', () => {
  const notes = buildNotes({
    commits: [parseCommit('fix(chat): handle empty reply', 'deadbeef'.padEnd(40, '0'))],
    repository,
    previousTag: '',
    tag: 'v0.1.0',
  });
  assert.match(notes, /\*\*chat:\*\* handle empty reply \(\[deadbee\]/);
});

test('when decideBump gets an empty list, should return null', () => {
  assert.equal(decideBump([], [0, 1, 0]), null);
});
