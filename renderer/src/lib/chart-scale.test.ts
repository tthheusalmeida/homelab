import { describe, expect, it } from 'vitest';

import { niceScale } from './chart-scale';

describe('niceScale', () => {
  it('when the biggest value is 47 thousand, should go up to 60 thousand in steps of 15 thousand', () => {
    expect(niceScale(47_210)).toEqual({ max: 60_000, ticks: [0, 15_000, 30_000, 45_000, 60_000] });
  });

  it('when the biggest value is small, should keep a round scale above it', () => {
    const scale = niceScale(7);

    expect(scale.max).toBeGreaterThanOrEqual(7);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.ticks.at(-1)).toBe(scale.max);
  });

  it('when the biggest value is exactly on a round number, should not add another step', () => {
    expect(niceScale(100).max).toBe(100);
  });

  it('when everything is zero or invalid, should keep a minimal scale', () => {
    for (const value of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const scale = niceScale(value);

      expect(scale.max).toBeGreaterThan(0);
      expect(scale.ticks).toHaveLength(5);
    }
  });

  it('when asking for another number of divisions, should return that many plus the zero', () => {
    expect(niceScale(1000, 5).ticks).toHaveLength(6);
  });

  it.each([1, 3, 99, 1_234, 56_789, 9_999_999])(
    'when the biggest value is %d, should contain it with evenly spaced ticks',
    (value) => {
      const { max, ticks } = niceScale(value);
      const step = ticks[1] - ticks[0];

      expect(max).toBeGreaterThanOrEqual(value);
      expect(ticks.every((tick, index) => Math.abs(tick - step * index) < 1e-9)).toBe(true);
    },
  );
});
