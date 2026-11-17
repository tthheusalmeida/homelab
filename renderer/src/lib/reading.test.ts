import { describe, expect, it } from 'vitest';

import {
  DEFAULT_READING,
  READING_COLOR_NAMES,
  READING_FONT_IDS,
  READING_FONT_SIZE,
  READING_SHADES_LIST,
  READING_ZOOM,
} from '#shared/contracts/reading';

import {
  fontSizeRem,
  inkOn,
  isLightColor,
  readingColor,
  readingColorLabels,
  readingFontFamilies,
  readingFontHints,
  readingFontLabels,
  readingStyle,
  readingSwatch,
  stepFontSize,
  stepZoom,
  zoomedFontSizeRem,
} from './reading';
import { READING_SHADES } from './reading-shades';

describe('reading font size', () => {
  it('when increasing, should go up by 2', () => {
    expect(stepFontSize(16, 1)).toBe(18);
  });

  it('when decreasing, should go down by 2', () => {
    expect(stepFontSize(16, -1)).toBe(14);
  });

  it('when already at the minimum, should not go below 8', () => {
    expect(stepFontSize(READING_FONT_SIZE.min, -1)).toBe(8);
  });

  it('when already at the maximum, should not go above it', () => {
    expect(stepFontSize(READING_FONT_SIZE.max, 1)).toBe(READING_FONT_SIZE.max);
  });

  it('when going from the minimum to the maximum, should have 13 levels', () => {
    let size: number = READING_FONT_SIZE.min;
    let levels = 1;

    while (stepFontSize(size, 1) !== size) {
      size = stepFontSize(size, 1);
      levels += 1;
    }

    expect(levels).toBe(13);
    expect(size).toBe(32);
  });

  it('when converting to rem, should treat 16 as 1rem', () => {
    expect(fontSizeRem(16)).toBe('1rem');
    expect(fontSizeRem(8)).toBe('0.5rem');
    expect(fontSizeRem(32)).toBe('2rem');
  });
});

describe('reading zoom', () => {
  it('when stepping, should move by 10', () => {
    expect(stepZoom(100, 1)).toBe(110);
    expect(stepZoom(100, -1)).toBe(90);
  });

  it('when at the limits, should stay between 70 and 200', () => {
    expect(stepZoom(READING_ZOOM.min, -1)).toBe(70);
    expect(stepZoom(READING_ZOOM.max, 1)).toBe(200);
  });
});

describe('readingColor', () => {
  it('when the color is the default, should leave the theme colors alone', () => {
    expect(readingColor('default', 50)).toBeNull();
    expect(readingColor('default', 950)).toBeNull();
  });

  it('when a color and an intensity are chosen, should use exactly that shade', () => {
    expect(readingColor('amber', 50)).toBe(READING_SHADES.amber[50]);
    expect(readingColor('amber', 300)).toBe(READING_SHADES.amber[300]);
    expect(readingColor('amber', 950)).toBe(READING_SHADES.amber[950]);
  });

  it('when the intensity changes, should give a different color', () => {
    expect(readingColor('sky', 200)).not.toBe(readingColor('sky', 800));
  });
});

describe('reading options', () => {
  it('when listing fonts, should have a label, a hint and a family for each one', () => {
    for (const font of READING_FONT_IDS) {
      expect(readingFontLabels[font]).toBeTruthy();
      expect(readingFontHints[font]).toBeTruthy();
      expect(readingFontFamilies[font]).toBeTruthy();
    }
  });

  it('when the font is the default, should use the project font', () => {
    expect(readingFontFamilies.default).toBe('var(--font-sans)');
  });

  it('when listing colors, should have a label and every shade for each one', () => {
    expect(readingColorLabels.default).toBe('Padrão');

    for (const color of READING_COLOR_NAMES) {
      expect(readingColorLabels[color]).toBeTruthy();
      expect(readingSwatch(color)).toMatch(/^oklch\(/);

      for (const shade of READING_SHADES_LIST) {
        expect(READING_SHADES[color][shade]).toMatch(/^oklch\(/);
      }
    }
  });
});

describe('zoomedFontSizeRem', () => {
  it('when the zoom is 100%, should be the chosen size in rem', () => {
    expect(zoomedFontSizeRem(16, 100)).toBe('1rem');
    expect(zoomedFontSizeRem(20, 100)).toBe('1.25rem');
  });

  it('when zooming, should scale the letter like a pdf does', () => {
    expect(zoomedFontSizeRem(16, 150)).toBe('1.5rem');
    expect(zoomedFontSizeRem(16, 200)).toBe('2rem');
    expect(zoomedFontSizeRem(16, 70)).toBe('0.7rem');
  });

  it('when the result has long decimals, should round it', () => {
    expect(zoomedFontSizeRem(22, 130)).toBe('1.7875rem');
    expect(zoomedFontSizeRem(14, 110)).toBe('0.9625rem');
  });
});

describe('readingStyle', () => {
  it('when the preferences are the defaults, should only set font, size and zoom', () => {
    expect(readingStyle(DEFAULT_READING)).toEqual({
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',
      '--reading-zoom': 1,
    });
  });

  it('when zoom is applied, should grow the letter and widen the column together', () => {
    const style = readingStyle({
      ...DEFAULT_READING,
      fontSize: 20,
      zoom: 150,
    }) as Record<string, unknown>;

    expect(style.fontSize).toBe('1.875rem');
    expect(style['--reading-zoom']).toBe(1.5);
  });

  it('when colors and intensities are chosen, should expose them as variables', () => {
    const style = readingStyle({
      ...DEFAULT_READING,
      font: 'lora',
      background: 'amber',
      backgroundShade: 200,
      text: 'stone',
      textShade: 700,
    }) as Record<string, unknown>;

    expect(style.fontFamily).toBe(readingFontFamilies.lora);
    expect(style['--reading-bg']).toBe(READING_SHADES.amber[200]);
    expect(style['--reading-fg']).toBe(READING_SHADES.stone[700]);
  });
});

describe('isLightColor', () => {
  it('when the color is very light, should be light', () => {
    expect(isLightColor(READING_SHADES.amber[50])).toBe(true);
    expect(isLightColor(READING_SHADES.yellow[500])).toBe(true);
  });

  it('when the color is dark, should not be light', () => {
    expect(isLightColor(READING_SHADES.stone[900])).toBe(false);
    expect(isLightColor(READING_SHADES.indigo[950])).toBe(false);
  });
});

describe('inkOn', () => {
  it('when the background is light, should give a dark ink', () => {
    expect(inkOn(READING_SHADES.sky[100])).toBe('oklch(0.22 0 0)');
  });

  it('when the background is dark, should give a light ink', () => {
    expect(inkOn(READING_SHADES.sky[900])).toBe('oklch(0.97 0 0)');
  });
});

describe('readingStyle contrast', () => {
  it('when the background is custom and the text is the default, should write with the ink that reads on that background (not the theme)', () => {
    const light = readingStyle({
      ...DEFAULT_READING,
      background: 'amber',
      backgroundShade: 100,
    }) as Record<string, unknown>;
    const dark = readingStyle({
      ...DEFAULT_READING,
      background: 'amber',
      backgroundShade: 950,
    }) as Record<string, unknown>;

    expect(light['--reading-fg']).toBe('oklch(0.22 0 0)');
    expect(dark['--reading-fg']).toBe('oklch(0.97 0 0)');
  });

  it('when the text color is chosen, should keep exactly the chosen color', () => {
    const style = readingStyle({
      ...DEFAULT_READING,
      background: 'amber',
      backgroundShade: 100,
      text: 'indigo',
      textShade: 800,
    }) as Record<string, unknown>;

    expect(style['--reading-fg']).toBe(READING_SHADES.indigo[800]);
  });

  it('when the background is custom, should invert the side tab against it', () => {
    const style = readingStyle({
      ...DEFAULT_READING,
      background: 'amber',
      backgroundShade: 100,
    }) as Record<string, unknown>;

    expect(style['--reading-tab-bg']).toBe('oklch(0.22 0 0)');
    expect(style['--reading-tab-fg']).toBe(READING_SHADES.amber[100]);
  });

  it('when the background is the default, should leave the tab to the theme', () => {
    const style = readingStyle(DEFAULT_READING) as Record<string, unknown>;

    expect(style['--reading-tab-bg']).toBeUndefined();
    expect(style['--reading-tab-fg']).toBeUndefined();
    expect(style['--reading-fg']).toBeUndefined();
  });

  it('when a separator color is chosen, should expose it; otherwise should leave it to the text color', () => {
    const chosen = readingStyle({
      ...DEFAULT_READING,
      separator: 'teal',
      separatorShade: 300,
    }) as Record<string, unknown>;

    expect(chosen['--reading-sep']).toBe(READING_SHADES.teal[300]);
    expect(
      (readingStyle(DEFAULT_READING) as Record<string, unknown>)['--reading-sep'],
    ).toBeUndefined();
  });

  it('when the background is custom, should set the native color scheme from it (light background, light scheme)', () => {
    const light = readingStyle({
      ...DEFAULT_READING,
      background: 'amber',
      backgroundShade: 100,
    }) as Record<string, unknown>;
    const dark = readingStyle({
      ...DEFAULT_READING,
      background: 'stone',
      backgroundShade: 950,
    }) as Record<string, unknown>;

    expect(light.colorScheme).toBe('light');
    expect(dark.colorScheme).toBe('dark');
  });

  it('when the background is the default, should not force a color scheme', () => {
    expect((readingStyle(DEFAULT_READING) as Record<string, unknown>).colorScheme).toBeUndefined();
  });
});
