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

describe('parseReading swapped sides', () => {
  it('when an old copy has no swap option, should keep the sides as they are by default', () => {
    const { swapSides, ...old } = DEFAULT_READING;

    expect(swapSides).toBe(false);
    expect(parseReading(old)?.swapSides).toBe(false);
  });

  it('when the sides are swapped, should keep it', () => {
    expect(parseReading({ ...DEFAULT_READING, swapSides: true })?.swapSides).toBe(true);
  });

  it.each(['true', 1, null])('when the swap option is %j, should return null', (value) => {
    expect(parseReading({ ...DEFAULT_READING, swapSides: value })).toBeNull();
  });
});

describe('parseReading separators', () => {
  it('when an old copy has no separator, should use the default (derived from the text)', () => {
    const { separator, separatorShade, ...old } = DEFAULT_READING;

    expect(separator).toBe('default');
    expect(separatorShade).toBe(500);
    expect(parseReading(old)).toEqual(DEFAULT_READING);
  });

  it('when the separator has a color and intensity, should keep them', () => {
    const reading = { ...DEFAULT_READING, separator: 'teal', separatorShade: 300 };

    expect(parseReading(reading)).toEqual(reading);
  });

  it.each(['brown', 1, null])('when the separator color is %j, should return null', (value) => {
    expect(parseReading({ ...DEFAULT_READING, separator: value })).toBeNull();
  });

  it.each([0, 55, '500', null])(
    'when the separator intensity is %j, should return null',
    (value) => {
      expect(parseReading({ ...DEFAULT_READING, separatorShade: value })).toBeNull();
    },
  );
});

describe('reading color order', () => {
  it('when listing the colors, should go from the warmest to the coldest with the neutral last', () => {
    expect(READING_COLOR_NAMES[0]).toBe('rose');
    expect(READING_COLOR_NAMES.indexOf('orange')).toBeLessThan(
      READING_COLOR_NAMES.indexOf('green'),
    );
    expect(READING_COLOR_NAMES.indexOf('green')).toBeLessThan(READING_COLOR_NAMES.indexOf('blue'));
    expect(READING_COLOR_NAMES[READING_COLOR_NAMES.length - 1]).toBe('stone');
  });
});

describe('reading colors', () => {
  it('when listing the options, should offer the default plus at most 15 tailwind colors', () => {
    expect(READING_COLOR_NAMES).toHaveLength(15);
    expect(READING_COLOR_IDS).toHaveLength(16);
    expect(READING_COLOR_IDS[0]).toBe('default');
  });
});
