import { describe, expect, it } from 'vitest';

import type { LibraryInfographic } from '#shared/contracts/library';
import { INFOGRAPHIC_LIMITS } from '#shared/infographic-layouts';

import { textAt, textField, withText, type TextKind } from './infographic-text-edit';

const base: LibraryInfographic = {
  kicker: 'Saúde · Sono',
  title: 'Dormir bem',
  subtitle: 'O que fazer',
  intro: 'Sono é saúde.',
  piece: 'saude.cruz',
  sections: [
    {
      layout: 'steps',
      title: 'Passos',
      subtitle: 'Em ordem',
      note: 'Cuide do sono',
      meterLabel: 'Intensidade',
      piece: '',
      items: [
        { piece: 'a.b', title: 'A', text: 'a', tag: '1', extra: 'x' },
        { piece: 'a.b', title: 'B', text: 'b' },
      ],
      sides: [
        { piece: 'a.b', title: 'Lado A' },
        { piece: 'a.b', title: 'Lado B' },
      ],
      tips: ['Dica 1', 'Dica 2'],
    },
  ],
  takeaways: ['Lembre 1', 'Lembre 2'],
  model: 'm',
  createdAt: 'd',
  stale: false,
};

describe('textAt', () => {
  it.each([
    ['kicker', 'Saúde · Sono'],
    ['title', 'Dormir bem'],
    ['subtitle', 'O que fazer'],
    ['intro', 'Sono é saúde.'],
  ] as const)('when reading the %s of the cover, should answer it', (kind, expected) => {
    expect(textAt(base, { section: null, kind })).toBe(expected);
  });

  it('when reading a takeaway, should answer the one of that position', () => {
    expect(textAt(base, { section: null, kind: 'takeaway', index: 1 })).toBe('Lembre 2');
  });

  it.each([
    ['title', undefined, 'Passos'],
    ['subtitle', undefined, 'Em ordem'],
    ['note', undefined, 'Cuide do sono'],
    ['meterLabel', undefined, 'Intensidade'],
    ['item.title', 1, 'B'],
    ['item.text', 0, 'a'],
    ['item.tag', 0, '1'],
    ['item.extra', 0, 'x'],
    ['side.title', 1, 'Lado B'],
    ['tip', 1, 'Dica 2'],
  ] as const)('when reading the %s of the section, should answer it', (kind, index, expected) => {
    expect(textAt(base, { section: 0, kind, index })).toBe(expected);
  });

  it.each([
    ['a section that does not exist', { section: 9, kind: 'title' as const }],
    ['an item that does not exist', { section: 0, kind: 'item.title' as const, index: 9 }],
    ['an optional text that was not written', { section: 0, kind: 'item.tag' as const, index: 1 }],
    ['a kind that does not belong to the cover', { section: null, kind: 'note' as const }],
    ['a takeaway that does not exist', { section: null, kind: 'takeaway' as const, index: 9 }],
  ])('when reading %s, should answer an empty text', (_name, target) => {
    expect(textAt(base, target)).toBe('');
  });
});

describe('withText', () => {
  it('when changing the title of the cover, should change only it', () => {
    const next = withText(base, { section: null, kind: 'title' }, 'Novo');

    expect(next.title).toBe('Novo');
    expect(next.sections).toBe(base.sections);
  });

  it('when changing the title of a section, should change only that section', () => {
    const next = withText(base, { section: 0, kind: 'title' }, 'Novo');

    expect(next.sections[0].title).toBe('Novo');
    expect(next.sections[0].items).toBe(base.sections[0].items);
  });

  it('when changing an item text, should change only that item', () => {
    const next = withText(base, { section: 0, kind: 'item.text', index: 1 }, 'novo');

    expect(next.sections[0].items.map((item) => item.text)).toEqual(['a', 'novo']);
    expect(next.sections[0].items[1].title).toBe('B');
  });

  it('when changing a side of the comparison, should change only that side', () => {
    const next = withText(base, { section: 0, kind: 'side.title', index: 0 }, 'Novo lado');

    expect(next.sections[0].sides?.map((side) => side.title)).toEqual(['Novo lado', 'Lado B']);
  });

  it('when changing a tip or a takeaway, should change only that one', () => {
    const tip = withText(base, { section: 0, kind: 'tip', index: 0 }, 'Nova dica');
    const takeaway = withText(base, { section: null, kind: 'takeaway', index: 1 }, 'Nova frase');

    expect(tip.sections[0].tips).toEqual(['Nova dica', 'Dica 2']);
    expect(takeaway.takeaways).toEqual(['Lembre 1', 'Nova frase']);
  });

  it.each([
    ['the subtitle of the cover', { section: null, kind: 'subtitle' as const }, 'subtitle'],
    ['the kicker of the cover', { section: null, kind: 'kicker' as const }, 'kicker'],
    ['the intro of the cover', { section: null, kind: 'intro' as const }, 'intro'],
  ])(
    'when %s is left blank, should remove the field instead of saving an empty text',
    (_name, target, key) => {
      const next = withText(base, target, '');

      expect(next).not.toHaveProperty(key);
    },
  );

  it('when an optional text of a section or item is left blank, should remove the field', () => {
    const note = withText(base, { section: 0, kind: 'note' }, '');
    const tag = withText(base, { section: 0, kind: 'item.tag', index: 0 }, '');
    const extra = withText(base, { section: 0, kind: 'item.extra', index: 0 }, '');

    expect(note.sections[0]).not.toHaveProperty('note');
    expect(tag.sections[0].items[0]).not.toHaveProperty('tag');
    expect(extra.sections[0].items[0]).not.toHaveProperty('extra');
  });

  it('when changing, should never change the original infographic', () => {
    const copy = structuredClone(base);

    withText(base, { section: 0, kind: 'item.title', index: 0 }, 'Novo');
    withText(base, { section: null, kind: 'subtitle' }, '');
    withText(base, { section: 0, kind: 'tip', index: 0 }, 'Nova');

    expect(base).toEqual(copy);
  });

  it.each([
    ['a section that does not exist', { section: 9, kind: 'title' as const }],
    ['an item that does not exist', { section: 0, kind: 'item.title' as const, index: 9 }],
    ['a side that does not exist', { section: 0, kind: 'side.title' as const, index: 9 }],
    ['a tip that does not exist', { section: 0, kind: 'tip' as const, index: 9 }],
    ['a takeaway that does not exist', { section: null, kind: 'takeaway' as const, index: 9 }],
    ['a kind that does not belong to the cover', { section: null, kind: 'note' as const }],
  ])('when the place is %s, should answer the same infographic', (_name, target) => {
    expect(withText(base, target, 'x')).toBe(base);
  });
});

describe('textField', () => {
  const kinds: TextKind[] = [
    'kicker',
    'title',
    'subtitle',
    'intro',
    'note',
    'meterLabel',
    'item.title',
    'item.text',
    'item.tag',
    'item.extra',
    'side.title',
    'tip',
    'takeaway',
  ];

  it.each(kinds)('when asking about %s, should answer a label and a positive limit', (kind) => {
    const field = textField(kind);

    expect(field.label.length).toBeGreaterThan(0);
    expect(field.max).toBeGreaterThan(0);
  });

  it('when asking about the limits, should be the same the server uses to cut the texts', () => {
    expect(textField('title').max).toBe(INFOGRAPHIC_LIMITS.maxTitleChars);
    expect(textField('item.text').max).toBe(INFOGRAPHIC_LIMITS.maxItemTextChars);
    expect(textField('item.tag').max).toBe(INFOGRAPHIC_LIMITS.maxTagChars);
    expect(textField('takeaway').max).toBe(INFOGRAPHIC_LIMITS.maxTakeawayChars);
  });

  it('when a text is essential, should be required; when it is extra, should not', () => {
    expect(textField('title').required).toBe(true);
    expect(textField('item.title').required).toBe(true);
    expect(textField('item.text').required).toBe(true);
    expect(textField('subtitle').required).toBe(false);
    expect(textField('item.tag').required).toBe(false);
    expect(textField('note').required).toBe(false);
  });

  it('when a text is long, should allow several lines; when it is a name or a number, one', () => {
    expect(textField('intro').multiline).toBe(true);
    expect(textField('item.text').multiline).toBe(true);
    expect(textField('title').multiline).toBe(false);
    expect(textField('item.tag').multiline).toBe(false);
  });
});
