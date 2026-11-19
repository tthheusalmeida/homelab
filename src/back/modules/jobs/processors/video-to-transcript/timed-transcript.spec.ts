import type { TranscriptSegment } from '../../../ai/whisper/whisper.service';

import {
  buildTimedTranscript,
  formatTimestamp,
  groupParagraphs,
  PARAGRAPH_GAP_MS,
  PARAGRAPH_HARD_LIMIT,
  PARAGRAPH_SOFT_LIMIT,
  TIMESTAMP_PREFIX,
} from './timed-transcript';

const seg = (startMs: number, endMs: number, text: string): TranscriptSegment => ({
  startMs,
  endMs,
  text,
});

describe('formatTimestamp', () => {
  it.each([
    [0, '[00:00:00]'],
    [999, '[00:00:00]'],
    [65_000, '[00:01:05]'],
    [3_723_000, '[01:02:03]'],
    [100 * 3600 * 1000, '[100:00:00]'],
  ])('when the start is %i ms, should format it as %s', (ms, expected) => {
    expect(formatTimestamp(ms)).toBe(expected);
  });

  it('when the start is negative, should clamp to zero', () => {
    expect(formatTimestamp(-5)).toBe('[00:00:00]');
  });

  it('when the stamp is formatted, should be read back by the prefix pattern', () => {
    expect(TIMESTAMP_PREFIX.test(`${formatTimestamp(3_723_000)} texto`)).toBe(true);
  });
});

describe('groupParagraphs', () => {
  it('when there are no segments, should return no paragraphs', () => {
    expect(groupParagraphs([])).toEqual([]);
  });

  it('when segments are close together, should join them in one paragraph starting at the first', () => {
    const result = groupParagraphs([seg(1000, 2000, 'Olá'), seg(2100, 3000, 'mundo.')]);

    expect(result).toEqual([{ startMs: 1000, text: 'Olá mundo.' }]);
  });

  it('when there is a long pause, should start a new paragraph at the next segment', () => {
    const result = groupParagraphs([
      seg(0, 1000, 'Primeiro.'),
      seg(1000 + PARAGRAPH_GAP_MS, 5000, 'Segundo.'),
    ]);

    expect(result).toEqual([
      { startMs: 0, text: 'Primeiro.' },
      { startMs: 3000, text: 'Segundo.' },
    ]);
  });

  it('when the pause is just under the limit, should keep the same paragraph', () => {
    const result = groupParagraphs([
      seg(0, 1000, 'A'),
      seg(1000 + PARAGRAPH_GAP_MS - 1, 4000, 'B'),
    ]);

    expect(result).toHaveLength(1);
  });

  it('when the paragraph is big and the sentence ended, should break at the next segment', () => {
    const long = `${'a'.repeat(PARAGRAPH_SOFT_LIMIT)}.`;

    const result = groupParagraphs([seg(0, 1000, long), seg(1100, 2000, 'Nova frase.')]);

    expect(result.map((p) => p.startMs)).toEqual([0, 1100]);
  });

  it('when the paragraph is big but the sentence did not end, should keep going', () => {
    const long = 'a'.repeat(PARAGRAPH_SOFT_LIMIT);

    const result = groupParagraphs([seg(0, 1000, long), seg(1100, 2000, 'continua')]);

    expect(result).toHaveLength(1);
  });

  it('when the paragraph reaches the hard limit, should break even without punctuation', () => {
    const long = 'a'.repeat(PARAGRAPH_HARD_LIMIT);

    const result = groupParagraphs([seg(0, 1000, long), seg(1100, 2000, 'outra')]);

    expect(result).toHaveLength(2);
  });

  it('when a segment has only blanks, should ignore it without breaking the paragraph', () => {
    const result = groupParagraphs([
      seg(0, 1000, 'A'),
      seg(1100, 1200, '  \n '),
      seg(1300, 2000, 'B'),
    ]);

    expect(result).toEqual([{ startMs: 0, text: 'A B' }]);
  });
});

describe('buildTimedTranscript', () => {
  it('when there are paragraphs, should write one block per paragraph with the time first', () => {
    const body = buildTimedTranscript([
      seg(0, 1000, 'Olá.'),
      seg(10_000, 12_000, 'Depois de um tempo.'),
    ]);

    expect(body).toBe('[00:00:00] Olá.\n\n[00:00:10] Depois de um tempo.');
  });

  it('when the last paragraph ends with the alleged signature, should remove it', () => {
    const body = buildTimedTranscript([seg(0, 1000, 'Fim. Legenda por Sônia Ruberti.')]);

    expect(body).toBe('[00:00:00] Fim.');
  });

  it('when the signature is the whole last paragraph, should drop that paragraph', () => {
    const body = buildTimedTranscript([
      seg(0, 1000, 'Conteúdo.'),
      seg(9000, 10_000, 'Legenda por Sônia Ruberti.'),
    ]);

    expect(body).toBe('[00:00:00] Conteúdo.');
  });

  it('when there is no speech, should return an empty body', () => {
    expect(buildTimedTranscript([])).toBe('');
  });
});
