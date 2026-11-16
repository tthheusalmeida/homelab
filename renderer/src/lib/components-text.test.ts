import { describe, expect, it } from 'vitest';

import { component } from '#test/components-fixtures';

import { overallPercent, pendingBytes, progressPercent, progressText } from './components-text';

describe('components-text', () => {
  it('when computing a percentage, should round and cap it at 100', () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(5, 2)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });

  it('when a component has progress, should describe bytes and percent', () => {
    const text = progressText(
      component({ progress: { receivedBytes: 1048576, totalBytes: 2097152 } }),
    );

    expect(text).toBe('1,0 MB de 2,0 MB (50%)');
  });

  it('when a component has no progress, should fall back to the state label', () => {
    expect(progressText(component({ state: 'verifying' }))).toBe('Conferindo o arquivo');
  });

  it('when reading the overall progress, should use the byte totals', () => {
    expect(overallPercent({ total: 2, done: 1, receivedBytes: 250, totalBytes: 1000 })).toBe(25);
  });

  it('when summing the pending bytes, should ignore installed and unselected components', () => {
    const list = [
      component({ id: 'a', sizeBytes: 100 }),
      component({ id: 'b', sizeBytes: 200, state: 'installed' }),
      component({ id: 'c', sizeBytes: 400 }),
    ];

    expect(pendingBytes(list, new Set(['a', 'b']))).toBe(100);
  });
});
