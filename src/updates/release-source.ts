import { compareVersions, parseVersion } from './version';

/** Repositório público de onde saem as versões do HomeLab. */
export const UPDATE_REPOSITORY = 'tthheusalmeida/homelab';

/** Instalador do Windows anexado ao Release (`electron-builder`: `HomeLab-Setup-<versão>.exe`). */
export const WINDOWS_INSTALLER = /^HomeLab-Setup-.+\.exe$/;

/** Só tags de versão do app (`v1.2.3`): Releases de componentes e binários ficam de fora. */
const APP_TAG = /^v\d+\.\d+\.\d+$/;

const TRUSTED_ASSET_HOST = 'github.com';

export interface InstallerAsset {
  name: string;
  /** Endereço de download (sempre https em github.com). */
  url: string;
  size: number;
  /** SHA-256 informado pelo GitHub para o arquivo; `null` quando o Release não traz. */
  sha256: string | null;
}

export interface LatestRelease {
  version: string;
  notes: string;
  url: string;
  publishedAt: string | null;
  installer: InstallerAsset | null;
}

export type FetchJson = (url: string) => Promise<unknown>;

interface GithubAsset {
  name?: unknown;
  browser_download_url?: unknown;
  size?: unknown;
  state?: unknown;
  digest?: unknown;
}

interface GithubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  body?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  assets?: unknown;
}

const isTrusted = (url: string): boolean => {
  try {
    const parsed = new URL(url);

    return parsed.protocol === 'https:' && parsed.hostname === TRUSTED_ASSET_HOST;
  } catch {
    return false;
  }
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

function toInstaller(assets: unknown, pattern: RegExp): InstallerAsset | null {
  if (!Array.isArray(assets)) {
    return null;
  }

  for (const raw of assets as GithubAsset[]) {
    const name = text(raw?.name);
    const url = text(raw?.browser_download_url);

    if (!pattern.test(name) || !isTrusted(url) || raw.state !== 'uploaded') {
      continue;
    }

    const digest = text(raw.digest);

    return {
      name,
      url,
      size: typeof raw.size === 'number' ? raw.size : 0,
      sha256: /^sha256:[0-9a-fA-F]{64}$/.test(digest) ? digest.slice('sha256:'.length) : null,
    };
  }

  return null;
}

/**
 * Descobre a versão mais nova publicada no GitHub. Ignora rascunhos, pré-lançamentos e tags que
 * não são de versão do app, e escolhe a maior pelo SemVer (não a mais recente por data).
 */
export class GitHubReleaseSource {
  constructor(
    private readonly repository: string,
    private readonly fetchJson: FetchJson,
    private readonly installerPattern: RegExp = WINDOWS_INSTALLER,
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
      installer: toInstaller(release.assets, this.installerPattern),
    };
  }
}
