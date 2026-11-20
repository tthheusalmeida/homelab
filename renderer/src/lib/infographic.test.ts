import { describe, expect, it } from 'vitest';

import { INFOGRAPHIC_LAYOUT_IDS } from '#shared/infographic-layouts';

import { AUTO_LAYOUT, infographicImageName, LAYOUT_OPTIONS, layoutLabel } from './infographic';

describe('LAYOUT_OPTIONS', () => {
  it('when listing the options, should start with the automatic one and then every layout', () => {
    expect(LAYOUT_OPTIONS[0]).toEqual({ id: AUTO_LAYOUT, label: 'História completa' });
    expect(LAYOUT_OPTIONS.slice(1).map((option) => option.id)).toEqual([...INFOGRAPHIC_LAYOUT_IDS]);
  });

  it('when listing the options, should have a readable name for each', () => {
    for (const option of LAYOUT_OPTIONS) {
      expect(option.label.trim()).not.toBe('');
    }
  });
});

describe('layoutLabel', () => {
  it('when asking for a known layout, should answer its name', () => {
    expect(layoutLabel('steps')).toBe('Guia em passos');
    expect(layoutLabel('myths')).toBe('Mitos e verdades');
  });

  it('when the layout is unknown, should fall back to the id', () => {
    expect(layoutLabel('nada' as never)).toBe('nada');
  });
});

describe('infographicImageName', () => {
  it('when the title is simple, should prefix it with "Infográfico"', () => {
    expect(infographicImageName('Redes')).toBe('Infográfico - Redes');
  });

  it('when the image has no background, should say so in the name', () => {
    expect(infographicImageName('Redes', true)).toBe('Infográfico - Redes (sem fundo)');
  });

  it('when the title is empty, should use only "Infográfico"', () => {
    expect(infographicImageName('   ')).toBe('Infográfico');
  });

  it('when the title has extra spaces or is huge, should tidy and cut it', () => {
    expect(infographicImageName('  Muitos   espaços  ')).toBe('Infográfico - Muitos espaços');
    expect(infographicImageName('a'.repeat(200))).toHaveLength('Infográfico - '.length + 80);
  });
});
