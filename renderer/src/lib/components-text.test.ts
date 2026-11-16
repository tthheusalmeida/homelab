import { describe, expect, it } from 'vitest';

import { component } from '#test/components-fixtures';

import {
  idsToInstall,
  overallPercent,
  pendingBytes,
  progressPercent,
  progressText,
} from './components-text';

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

describe('idsToInstall', () => {
  const list = [
    component({ id: 'ffmpeg', required: true, bundled: false, sizeBytes: 80, state: 'missing' }),
    component({ id: 'runtime', required: true, bundled: true, sizeBytes: 0, state: 'missing' }),
    component({ id: 'done', required: true, bundled: false, sizeBytes: 5, state: 'installed' }),
    component({ id: 'model', sizeBytes: 20, state: 'missing' }),
    component({ id: 'other', sizeBytes: 30, state: 'missing' }),
  ];

  it('when a required component is missing and downloadable, should include it without being selected', () => {
    expect(idsToInstall(list, new Set(['model'])).map((c) => c.id)).toEqual(['ffmpeg', 'model']);
  });

  it('when a component is bundled or already installed, should leave it out', () => {
    expect(idsToInstall(list, new Set(['runtime', 'done'])).map((c) => c.id)).toEqual(['ffmpeg']);
  });

  it('when counting bytes, should include the missing required ones', () => {
    expect(pendingBytes(list, new Set(['model']))).toBe(100);
  });
});
