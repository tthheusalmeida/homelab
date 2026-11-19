import { describe, expect, it } from 'vitest';

import {
  computeExcerptProgress,
  excerptSpans,
  READING_LINE_OFFSET,
  railFill,
  readingLine,
} from './transcript-progress';

const rects = [
  { top: 0, height: 100 },
  { top: 100, height: 100 },
  { top: 200, height: 100 },
];

describe('readingLine', () => {
  it('when the scroll is at the top, should sit just below the top edge', () => {
    expect(readingLine(50, 400, 0, 1000)).toBe(50 + READING_LINE_OFFSET);
  });

  it('when the scroll is at the end, should reach the bottom of the view', () => {
    expect(readingLine(50, 400, 1000, 1000)).toBe(50 + READING_LINE_OFFSET + 400);
  });

  it('when the scroll is halfway, should be halfway down the view', () => {
    expect(readingLine(0, 400, 500, 1000)).toBe(READING_LINE_OFFSET + 200);
  });

  it('when nothing can scroll, should stay at the top', () => {
    expect(readingLine(0, 400, 0, 0)).toBe(READING_LINE_OFFSET);
  });

  it('when the scroll goes past the end, should not go beyond the bottom', () => {
    expect(readingLine(0, 400, 1200, 1000)).toBe(READING_LINE_OFFSET + 400);
  });
});

describe('computeExcerptProgress', () => {
  it('when the line is above everything, should read nothing and point to the first', () => {
    expect(computeExcerptProgress(rects, -5)).toEqual({ fractions: [0, 0, 0], active: 0 });
  });

  it('when the line is inside the second excerpt, should have read the first and part of the second', () => {
    const { fractions, active } = computeExcerptProgress(rects, 150);

    expect(fractions).toEqual([1, 0.5, 0]);
    expect(active).toBe(1);
  });

  it('when the line is exactly at the start of an excerpt, should point to it with nothing read', () => {
    const { fractions, active } = computeExcerptProgress(rects, 200);

    expect(fractions).toEqual([1, 1, 0]);
    expect(active).toBe(2);
  });

  it('when the line is past the end, should mark all as read and keep the last as current', () => {
    const { fractions, active } = computeExcerptProgress(rects, 999);

    expect(fractions).toEqual([1, 1, 1]);
    expect(active).toBe(2);
  });

  it('when there are no excerpts, should return empty progress', () => {
    expect(computeExcerptProgress([], 10)).toEqual({ fractions: [], active: 0 });
  });

  it('when an excerpt has no height, should count it as read only after the line passes it', () => {
    const flat = [{ top: 50, height: 0 }];

    expect(computeExcerptProgress(flat, 10).fractions).toEqual([0]);
    expect(computeExcerptProgress(flat, 60).fractions).toEqual([1]);
  });
});

describe('railFill', () => {
  it('when on the first excerpt with nothing read, should be empty', () => {
    expect(railFill(0, 0, 5)).toBe(0);
  });

  it('when on the third excerpt halfway, should be between the third and fourth hexagons', () => {
    expect(railFill(2, 0.5, 5)).toBeCloseTo(0.625);
  });

  it('when the last excerpt is fully read, should be full', () => {
    expect(railFill(4, 1, 5)).toBe(1);
  });

  it('when there is a single excerpt, should follow its own progress', () => {
    expect(railFill(0, 0.4, 1)).toBeCloseTo(0.4);
  });

  it('when there are no excerpts, should be empty', () => {
    expect(railFill(0, 0, 0)).toBe(0);
  });
});

describe('excerptSpans', () => {
  it('when there are no excerpts, should return an empty list', () => {
    expect(excerptSpans([])).toEqual([]);
  });

  it('when an excerpt has a next one, should end where the next starts', () => {
    const spans = excerptSpans([0, 60, 120]);

    expect(spans[0].end).toBeCloseTo(spans[1].start);
    expect(spans[1].end).toBeCloseTo(spans[2].start);
  });

  it('when it is the last excerpt, should end at the estimated end of the audio (1)', () => {
    const spans = excerptSpans([0, 60, 120]);

    expect(spans[2].end).toBe(1);
    expect(spans[2].start).toBeCloseTo(120 / 180);
  });

  it('when there is a single excerpt, should span the whole timeline', () => {
    expect(excerptSpans([0])).toEqual([{ start: 0, end: 1 }]);
  });
});
