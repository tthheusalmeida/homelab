// Cálculo de versão e changelog a partir de Conventional Commits (docs/versionamento.md).
// Funções puras: quem lê o git é `plan.mjs`.

/** Tipos que, ao entrar na main, geram uma versão nova. Os demais esperam o próximo release. */
export const RELEASE_TRIGGERS = ['feat', 'fix'];

const SECTIONS = [
  { key: 'breaking', title: 'Mudanças que quebram compatibilidade' },
  { key: 'feat', title: 'Novidades' },
  { key: 'fix', title: 'Correções' },
  { key: 'perf', title: 'Desempenho' },
];
const OTHER_TYPES = ['revert', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'style'];

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<subject>.+)$/;
const PR_SUFFIX = /\s*\(#(?<pr>\d+)\)\s*$/;

/** Lê uma mensagem de commit. Devolve `null` se a primeira linha não segue o padrão. */
export function parseCommit(message, hash = '') {
  const [header = '', ...rest] = message.trim().split('\n');
  const match = HEADER.exec(header.trim());
  if (!match) return null;
  const { type, scope, bang, subject } = match.groups;
  const body = rest.join('\n');
  const pr = PR_SUFFIX.exec(subject)?.groups.pr;
  return {
    hash,
    type,
    scope: scope ?? '',
    subject: subject.replace(PR_SUFFIX, '').trim(),
    pr: pr ?? '',
    breaking: Boolean(bang) || /^BREAKING[ -]CHANGE:/m.test(body),
  };
}

export function parseVersion(text) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function compareVersions(a, b) {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Maior tag `vX.Y.Z` da lista (ignora `components-v1`, `bin-v1` etc.). */
export function latestVersionTag(tags) {
  let best = null;
  for (const tag of tags) {
    if (!tag.startsWith('v')) continue;
    const version = parseVersion(tag);
    if (version && (!best || compareVersions(version, best.version) > 0)) best = { tag, version };
  }
  return best;
}

/** `major`, `minor`, `patch` ou `null` (nada que justifique release). Em 0.x, quebra sobe o MINOR. */
export function decideBump(commits, currentVersion) {
  if (commits.some((c) => c.breaking)) return currentVersion[0] === 0 ? 'minor' : 'major';
  if (commits.some((c) => c.type === 'feat')) return 'minor';
  if (commits.some((c) => RELEASE_TRIGGERS.includes(c.type))) return 'patch';
  return null;
}

export function bumpVersion(version, bump) {
  const [major, minor, patch] = version;
  if (bump === 'major') return [major + 1, 0, 0];
  if (bump === 'minor') return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

export const formatVersion = (version) => version.join('.');

function line(commit, repository) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  const ref = commit.pr
    ? `([#${commit.pr}](https://github.com/${repository}/pull/${commit.pr}))`
    : commit.hash
      ? `([${commit.hash.slice(0, 7)}](https://github.com/${repository}/commit/${commit.hash}))`
      : '';
  return `- ${scope}${commit.subject} ${ref}`.trimEnd();
}

/** Notas do Release em Markdown, agrupadas por tipo. */
export function buildNotes({ commits, repository, previousTag, tag }) {
  const parts = [];
  for (const { key, title } of SECTIONS) {
    const items = commits.filter((c) => (key === 'breaking' ? c.breaking : c.type === key && !c.breaking));
    if (items.length) parts.push(`## ${title}\n\n${items.map((c) => line(c, repository)).join('\n')}`);
  }
  const others = commits.filter((c) => OTHER_TYPES.includes(c.type) && !c.breaking);
  if (others.length) {
    parts.push(
      `<details>\n<summary>Outras mudanças (${others.length})</summary>\n\n${others
        .map((c) => line(c, repository))
        .join('\n')}\n\n</details>`,
    );
  }
  if (previousTag) {
    parts.push(`**Comparar:** https://github.com/${repository}/compare/${previousTag}...${tag}`);
  }
  return `${parts.join('\n\n')}\n`;
}

/** Decide o release: `{ release: false }` ou `{ release: true, version, tag, notes, bump }`. */
export function planRelease({ tags, messages, repository }) {
  const latest = latestVersionTag(tags);
  const current = latest ? latest.version : [0, 0, 0];
  const commits = messages.map(({ hash, message }) => parseCommit(message, hash)).filter(Boolean);
  const bump = decideBump(commits, current);
  if (!bump) return { release: false, reason: 'nenhum commit feat, fix ou quebra desde a última versão' };
  const version = formatVersion(bumpVersion(current, bump));
  const tag = `v${version}`;
  return {
    release: true,
    bump,
    version,
    tag,
    previousTag: latest?.tag ?? '',
    notes: buildNotes({ commits, repository, previousTag: latest?.tag ?? '', tag }),
  };
}
