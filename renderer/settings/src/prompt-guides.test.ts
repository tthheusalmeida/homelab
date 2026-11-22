import { describe, expect, it } from 'vitest';

import { PROMPT_KINDS, PROMPT_LIMITS } from '#shared/contracts/prompts';

import { EXAMPLE_HEADING, PROMPT_GUIDES, withExample } from './prompt-guides';

describe('PROMPT_GUIDES', () => {
  it.each(PROMPT_KINDS)(
    'when the prompt is %s, should have things to add, cautions and examples',
    (kind) => {
      const guide = PROMPT_GUIDES[kind];

      expect(guide.canAdd.length).toBeGreaterThan(0);
      expect(guide.careful.length).toBeGreaterThan(0);
      expect(guide.examples.length).toBeGreaterThanOrEqual(2);
    },
  );

  it.each(PROMPT_KINDS)(
    'when the prompt is %s, should warn about quantities, format and the base text',
    (kind) => {
      const careful = PROMPT_GUIDES[kind].careful.join(' ');

      expect(careful).toContain('quantidades');
      expect(careful).toContain('formato de resposta');
      expect(careful).toContain('texto base');
    },
  );

  it('when the prompt is the summary, should warn that dropping the base text drops the fidelity rules', () => {
    expect(PROMPT_GUIDES.summary.careful.join(' ')).toContain('fidelidade');
    expect(PROMPT_GUIDES.summary.careful.join(' ')).toContain('nível de detalhe');
  });

  it.each(PROMPT_KINDS)(
    'when the prompt is %s, should keep example ids unique and additions short',
    (kind) => {
      const { examples } = PROMPT_GUIDES[kind];

      expect(new Set(examples.map((example) => example.id)).size).toBe(examples.length);

      for (const example of examples) {
        expect(example.name.length).toBeLessThanOrEqual(PROMPT_LIMITS.maxNameChars);
        expect(example.addition.length).toBeLessThanOrEqual(400);
        expect(example.addition).not.toMatch(/JSON|\d+ (ramos|seções|tags|palavras)/);
      }
    },
  );

  it('when writing the examples, should not name internal tools or models', () => {
    const all = JSON.stringify(PROMPT_GUIDES);

    expect(all).not.toMatch(/ffmpeg|whisper|yt-dlp|cuda|gemini|ollama/i);
  });
});

describe('withExample', () => {
  const example = { id: 'x', name: 'X', description: 'd', addition: 'Seja direto.' };

  it('when building the starting text, should keep the whole default and add the example at the end', () => {
    const text = withExample('Texto padrão.\n', example);

    expect(text.startsWith('Texto padrão.')).toBe(true);
    expect(text.endsWith(`${EXAMPLE_HEADING}\n\n- Seja direto.`)).toBe(true);
  });

  it('when building the starting text, should separate the default from the adjustment by a blank line', () => {
    expect(withExample('Base.', example)).toBe(`Base.\n\n${EXAMPLE_HEADING}\n\n- Seja direto.`);
  });
});
