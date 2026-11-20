import { afterEach, describe, expect, it, vi } from 'vitest';

import { allowGeneration, dismissGeneration, isGenerationDismissed } from './dismissed-generation';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('dismissed-generation', () => {
  it('when nothing was dismissed, should report the page as free to generate', () => {
    expect(isGenerationDismissed('infographic', 'a')).toBe(false);
  });

  it('when a page is dismissed, should remember it (even after reading again)', () => {
    dismissGeneration('infographic', 'a');

    expect(isGenerationDismissed('infographic', 'a')).toBe(true);
    expect(isGenerationDismissed('infographic', 'b')).toBe(false);
  });

  it('when the mind map is dismissed, should not affect the infographic of the same page', () => {
    dismissGeneration('mind-map', 'a');

    expect(isGenerationDismissed('mind-map', 'a')).toBe(true);
    expect(isGenerationDismissed('infographic', 'a')).toBe(false);
  });

  it('when generation is allowed again, should forget the page', () => {
    dismissGeneration('mind-map', 'a');
    dismissGeneration('mind-map', 'b');
    allowGeneration('mind-map', 'a');

    expect(isGenerationDismissed('mind-map', 'a')).toBe(false);
    expect(isGenerationDismissed('mind-map', 'b')).toBe(true);
  });

  it('when the stored value is corrupted, should treat every page as free', () => {
    window.localStorage.setItem('homelab.dismissed.infographic', '{nao e lista');

    expect(isGenerationDismissed('infographic', 'a')).toBe(false);
  });

  it('when the stored list has other types, should ignore them', () => {
    window.localStorage.setItem('homelab.dismissed.infographic', JSON.stringify(['a', 3, null]));

    expect(isGenerationDismissed('infographic', 'a')).toBe(true);
  });

  it('when the storage throws, should not break', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });

    expect(() => dismissGeneration('infographic', 'a')).not.toThrow();
  });
});
