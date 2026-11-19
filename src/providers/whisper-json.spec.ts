import { parseClock, parseWhisperJson } from './whisper-json';

const entry = (from: number, to: number, text: string) => ({
  timestamps: { from: '00:00:00,000', to: '00:00:00,000' },
  offsets: { from, to },
  text,
});

describe('parseClock', () => {
  it.each([
    ['00:00:01,500', 1500],
    ['01:02:03,004', 3_723_004],
    ['00:00:05.5', 5500],
  ])('when the clock is %s, should return %i ms', (clock, ms) => {
    expect(parseClock(clock)).toBe(ms);
  });

  it.each([['abc'], [''], [undefined], [12]])('when the value is %p, should return null', (v) => {
    expect(parseClock(v)).toBeNull();
  });
});

describe('parseWhisperJson', () => {
  it('when the entries have offsets, should use them as milliseconds and trim the text', () => {
    const json = JSON.stringify({
      transcription: [entry(0, 4200, ' Olá  mundo '), entry(4200, 9000, ' Tchau')],
    });

    expect(parseWhisperJson(json)).toEqual([
      { startMs: 0, endMs: 4200, text: 'Olá mundo' },
      { startMs: 4200, endMs: 9000, text: 'Tchau' },
    ]);
  });

  it('when offsets are missing, should fall back to the timestamps text', () => {
    const json = JSON.stringify({
      transcription: [{ timestamps: { from: '00:01:00,000', to: '00:01:02,500' }, text: 'x' }],
    });

    expect(parseWhisperJson(json)).toEqual([{ startMs: 60_000, endMs: 62_500, text: 'x' }]);
  });

  it('when an entry has no text or no valid start, should skip it', () => {
    const json = JSON.stringify({
      transcription: [entry(0, 1000, '   '), { text: 'sem tempo' }, entry(1000, 2000, 'ok')],
    });

    expect(parseWhisperJson(json)).toEqual([{ startMs: 1000, endMs: 2000, text: 'ok' }]);
  });

  it('when the end is before the start, should not go back in time', () => {
    const json = JSON.stringify({ transcription: [entry(5000, 1000, 'x')] });

    expect(parseWhisperJson(json)[0]).toMatchObject({ startMs: 5000, endMs: 5000 });
  });

  it('when the transcription list is empty, should return no segments', () => {
    expect(parseWhisperJson(JSON.stringify({ transcription: [] }))).toEqual([]);
  });

  it('when the json has no transcription list, should throw', () => {
    expect(() => parseWhisperJson('{}')).toThrow('transcription');
  });

  it('when the text is not valid json, should throw', () => {
    expect(() => parseWhisperJson('nao e json')).toThrow();
  });
});
