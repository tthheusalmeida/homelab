import { describe, expect, it } from 'vitest';

import {
  DEFAULT_READING,
  READING_COLOR_NAMES,
  READING_FONT_IDS,
  READING_FONT_SIZE,
  READING_ZOOM,
} from '#shared/contracts/reading';

import {
  fontSizeRem,
  readingColor,
  readingColorLabels,
  readingFontFamilies,
  readingFontHints,
  readingFontLabels,
  readingStyle,
  readingSwatch,
  stepFontSize,
  stepZoom,
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
    expect(readingColor('default', 'background', false)).toBeNull();
    expect(readingColor('default', 'text', true)).toBeNull();
  });

  it('when the theme is light, should use a very light background and a dark text', () => {
    expect(readingColor('amber', 'background', false)).toBe(READING_SHADES.amber[50]);
    expect(readingColor('amber', 'text', false)).toBe(READING_SHADES.amber[900]);
  });

  it('when the theme is dark, should use a very dark background and a light text', () => {
    expect(readingColor('amber', 'background', true)).toBe(READING_SHADES.amber[950]);
    expect(readingColor('amber', 'text', true)).toBe(READING_SHADES.amber[100]);
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

      for (const shade of [50, 100, 500, 900, 950] as const) {
        expect(READING_SHADES[color][shade]).toMatch(/^oklch\(/);
      }
    }
  });
});

describe('readingStyle', () => {
  it('when the preferences are the defaults, should only set font, size and zoom', () => {
    expect(readingStyle(DEFAULT_READING, false)).toEqual({
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',
      '--reading-zoom': 1,
    });
  });

  it('when colors and zoom are chosen, should expose them as variables', () => {
    const style = readingStyle(
      {
        ...DEFAULT_READING,
        font: 'lora',
        fontSize: 20,
        zoom: 150,
        background: 'amber',
        text: 'stone',
      },
      false,
    ) as Record<string, unknown>;

    expect(style.fontFamily).toBe(readingFontFamilies.lora);
    expect(style.fontSize).toBe('1.25rem');
    expect(style['--reading-zoom']).toBe(1.5);
    expect(style['--reading-bg']).toBe(READING_SHADES.amber[50]);
    expect(style['--reading-fg']).toBe(READING_SHADES.stone[900]);
  });
});
