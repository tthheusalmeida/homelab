import { describe, expect, it } from 'vitest';

import {
  INFOGRAPHIC_LAYOUT_IDS,
  INFOGRAPHIC_SECTIONS,
  layoutInfo,
} from '#shared/infographic-layouts';
import { INFOGRAPHIC_PIECE_KEYS } from '#shared/infographic-pieces';

import { INFOGRAPHIC_SAMPLE, INFOGRAPHIC_SAMPLE_LAYOUTS } from './infographic-sample';

describe('INFOGRAPHIC_SAMPLE', () => {
  it('when listing the sections, should cover every layout exactly once', () => {
    expect([...INFOGRAPHIC_SAMPLE_LAYOUTS].sort()).toEqual([...INFOGRAPHIC_LAYOUT_IDS].sort());
    expect(INFOGRAPHIC_SAMPLE.sections.length).toBeGreaterThan(INFOGRAPHIC_SECTIONS.max - 1);
  });

  it('when reading each section, should respect the item count of its layout', () => {
    for (const section of INFOGRAPHIC_SAMPLE.sections) {
      const info = layoutInfo(section.layout);

      expect(section.items.length).toBeGreaterThanOrEqual(info.minItems);
      expect(section.items.length).toBeLessThanOrEqual(info.maxItems);
    }
  });

  it('when reading every piece key, should only use pieces that exist in the bank', () => {
    const keys = [
      INFOGRAPHIC_SAMPLE.piece,
      ...INFOGRAPHIC_SAMPLE.sections.flatMap((section) => [
        section.piece,
        ...(section.sides ?? []).map((side) => side.piece),
        ...section.items.map((item) => item.piece),
      ]),
    ].filter((key) => key !== '');

    for (const key of keys) {
      expect(INFOGRAPHIC_PIECE_KEYS.has(key)).toBe(true);
    }
  });

  it('when reading the comparison, should have two sides and a winner for each criterion', () => {
    const versus = INFOGRAPHIC_SAMPLE.sections.find((section) => section.layout === 'versus');

    expect(versus?.sides).toHaveLength(2);
    expect(versus?.items.every((item) => ['a', 'b', 'tie'].includes(item.winner ?? ''))).toBe(true);
  });

  it('when reading the sample, should not be marked as outdated', () => {
    expect(INFOGRAPHIC_SAMPLE.stale).toBe(false);
  });
});
