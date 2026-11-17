import { GitHubReleaseSource, type FetchJson } from './release-source';

const release = (tag: string, overrides: Record<string, unknown> = {}) => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  body: `Notas ${tag}`,
  html_url: `https://github.com/owner/repo/releases/tag/${tag}`,
  published_at: '2026-11-01T10:00:00Z',
  ...overrides,
});

const sourceWith = (data: unknown) => {
  const fetchJson = jest.fn<ReturnType<FetchJson>, Parameters<FetchJson>>().mockResolvedValue(data);

  return { source: new GitHubReleaseSource('owner/repo', fetchJson), fetchJson };
};

describe('GitHubReleaseSource', () => {
  it('when asked, should list the releases of the configured repository', async () => {
    const { source, fetchJson } = sourceWith([]);

    await source.latest();

    expect(fetchJson).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/releases?per_page=30',
    );
  });

  it('when there are releases, should pick the highest version, not the first listed', async () => {
    const { source } = sourceWith([release('v0.2.0'), release('v0.10.0'), release('v0.9.0')]);

    await expect(source.latest()).resolves.toMatchObject({
      version: '0.10.0',
      notes: 'Notas v0.10.0',
      url: 'https://github.com/owner/repo/releases/tag/v0.10.0',
      publishedAt: '2026-11-01T10:00:00Z',
    });
  });

  it('when a release is a draft or a prerelease, should skip it', async () => {
    const { source } = sourceWith([
      release('v9.0.0', { draft: true }),
      release('v8.0.0', { prerelease: true }),
      release('v0.3.0'),
    ]);

    await expect(source.latest()).resolves.toMatchObject({ version: '0.3.0' });
  });

  it('when a release is not an app version tag (components, binaries), should skip it', async () => {
    const { source } = sourceWith([release('components-v1'), release('bin-v2'), release('v0.3.0')]);

    await expect(source.latest()).resolves.toMatchObject({ version: '0.3.0' });
  });

  it('when no release qualifies, should answer null', async () => {
    const { source } = sourceWith([release('components-v1')]);

    await expect(source.latest()).resolves.toBeNull();
  });

  it('when the answer is not a list, should answer null', async () => {
    const { source } = sourceWith({ message: 'rate limited' });

    await expect(source.latest()).resolves.toBeNull();
  });
});
