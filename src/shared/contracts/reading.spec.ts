import {
  DEFAULT_READING,
  parseReading,
  READING_COLOR_IDS,
  READING_COLOR_NAMES,
  READING_SHADES_LIST,
} from './reading';

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

describe('parseReading shades', () => {
  it('when an old copy has no intensities, should fill them with the defaults', () => {
    const { backgroundShade, textShade, ...old } = DEFAULT_READING;

    expect(backgroundShade).toBe(50);
    expect(textShade).toBe(900);
    expect(parseReading({ ...old, fontSize: 20 })).toEqual({ ...DEFAULT_READING, fontSize: 20 });
  });

  it.each([0, 55, 1000, '500'])('when the intensity is %j, should return null', (shade) => {
    expect(parseReading({ ...DEFAULT_READING, backgroundShade: shade })).toBeNull();
    expect(parseReading({ ...DEFAULT_READING, textShade: shade })).toBeNull();
  });

  it('when listing the intensities, should go from 50 to 950', () => {
    expect(READING_SHADES_LIST[0]).toBe(50);
    expect(READING_SHADES_LIST).toHaveLength(11);
    expect(READING_SHADES_LIST[READING_SHADES_LIST.length - 1]).toBe(950);
  });
});

describe('parseReading side panel', () => {
  it('when an old copy has no side panel option, should keep it hidden by default', () => {
    const { pinSidebar, ...old } = DEFAULT_READING;

    expect(pinSidebar).toBe(false);
    expect(parseReading(old)?.pinSidebar).toBe(false);
  });

  it('when the side panel is pinned, should keep it', () => {
    expect(parseReading({ ...DEFAULT_READING, pinSidebar: true })?.pinSidebar).toBe(true);
  });

  it.each(['true', 1, null])('when the side panel option is %j, should return null', (value) => {
    expect(parseReading({ ...DEFAULT_READING, pinSidebar: value })).toBeNull();
  });
});

describe('reading colors', () => {
  it('when listing the options, should offer the default plus the 22 tailwind colors', () => {
    expect(READING_COLOR_NAMES).toHaveLength(22);
    expect(READING_COLOR_IDS).toHaveLength(23);
    expect(READING_COLOR_IDS[0]).toBe('default');
  });
});
