import type { UpdateStatus } from '#shared/contracts/updates';

export const updateStatus = (overrides: Partial<UpdateStatus> = {}): UpdateStatus => ({
  state: 'idle',
  currentVersion: '0.2.0',
  latest: null,
  progress: 0,
  error: null,
  checkedAt: null,
  canInstall: true,
  autoCheck: true,
  ...overrides,
});

/** Estado com uma versão nova disponível. */
export const availableUpdate = (overrides: Partial<UpdateStatus> = {}): UpdateStatus =>
  updateStatus({
    state: 'available',
    checkedAt: Date.UTC(2026, 10, 17, 12, 0),
    latest: {
      version: '0.3.0',
      notes: '## Novidades\n\n- Leitura mais rápida',
      url: 'https://github.com/owner/repo/releases/tag/v0.3.0',
      publishedAt: '2026-11-16T10:00:00Z',
    },
    ...overrides,
  });
