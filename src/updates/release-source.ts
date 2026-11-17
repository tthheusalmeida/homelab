import { compareVersions, parseVersion } from './version';

/** Repositório público de onde saem as versões do HomeLab. */
export const UPDATE_REPOSITORY = 'tthheusalmeida/homelab';

/** Só tags de versão do app (`v1.2.3`): Releases de componentes e binários ficam de fora. */
const APP_TAG = /^v\d+\.\d+\.\d+$/;

export interface LatestRelease {
  version: string;
  notes: string;
  url: string;
  publishedAt: string | null;
}

export type FetchJson = (url: string) => Promise<unknown>;

interface GithubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  body?: unknown;
  html_url?: unknown;
  published_at?: unknown;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Descobre a versão mais nova publicada no GitHub. Ignora rascunhos, pré-lançamentos e tags que
 * não são de versão do app, e escolhe a maior pelo SemVer (não a mais recente por data).
 */
export class GitHubReleaseSource {
  constructor(
    private readonly repository: string,
    private readonly fetchJson: FetchJson,
  ) {}

  async latest(): Promise<LatestRelease | null> {
    const data = await this.fetchJson(
      `https://api.github.com/repos/${this.repository}/releases?per_page=30`,
    );

    if (!Array.isArray(data)) {
      return null;
    }

    let best: { release: GithubRelease; version: string } | null = null;

    for (const release of data as GithubRelease[]) {
      const tag = text(release?.tag_name);

      if (release?.draft === true || release?.prerelease === true || !APP_TAG.test(tag)) {
        continue;
      }

      const version = tag.slice(1);
      const parsed = parseVersion(version);
      const current = best ? parseVersion(best.version) : null;

      if (parsed && (!current || compareVersions(parsed, current) > 0)) {
        best = { release, version };
      }
    }

    if (!best) {
      return null;
    }

    const { release, version } = best;

    return {
      version,
      notes: text(release.body),
      url: text(release.html_url),
      publishedAt: text(release.published_at) || null,
    };
  }
}
