import { DEFAULT_READING, parseReading, READING_COLOR_IDS, READING_COLOR_NAMES } from './reading';

describe('parseReading', () => {
  it('when the preferences are the defaults, should accept', () => {
    expect(parseReading(DEFAULT_READING)).toEqual(DEFAULT_READING);
  });

  it.each([
    null,
    undefined,
    'x',
    {},
    { ...DEFAULT_READING, font: 'comic' },
    { ...DEFAULT_READING, fontSize: 15 },
    { ...DEFAULT_READING, zoom: 95 },
    { ...DEFAULT_READING, text: 'brown' },
  ])('when the value is %j, should return null', (value) => {
    expect(parseReading(value)).toBeNull();
  });
});

describe('reading colors', () => {
  it('when listing the options, should offer the default plus the 22 tailwind colors', () => {
    expect(READING_COLOR_NAMES).toHaveLength(22);
    expect(READING_COLOR_IDS).toHaveLength(23);
    expect(READING_COLOR_IDS[0]).toBe('default');
  });
});
