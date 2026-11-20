import { INFOGRAPHIC_LIMITS, INFOGRAPHIC_SECTIONS } from '../../../../shared/infographic-layouts';
import { INFOGRAPHIC_PIECE_KEYS } from '../../../../shared/infographic-pieces';

import { InvalidInfographicError, parseInfographic } from './infographic';

const item = (n: number, extra: Record<string, unknown> = {}) => ({
  piece: 'tecnologia.chip',
  title: `Etapa ${n}`,
  text: `Texto ${n}`,
  ...extra,
});

const items = (count: number, extra: Record<string, unknown> = {}) =>
  Array.from({ length: count }, (_, i) => item(i + 1, extra));

const steps = (extra: Record<string, unknown> = {}) => ({
  layout: 'steps',
  title: 'Como funciona',
  items: items(3),
  ...extra,
});

const timeline = (extra: Record<string, unknown> = {}) => ({
  layout: 'timeline',
  title: 'A história',
  items: items(3, { tag: '1990' }),
  ...extra,
});

const story = (data: Record<string, unknown> = {}) => ({
  kicker: 'Tecnologia',
  title: 'Como a internet funciona',
  subtitle: 'Do código à tela',
  intro: 'Uma rede de redes.',
  piece: 'tecnologia.wifi',
  sections: [steps(), timeline(), steps({ title: 'Partes' }), timeline({ title: 'Marcos' })],
  takeaways: ['Lembre 1', 'Lembre 2'],
  ...data,
});

// O mínimo de seções é 4: as histórias de teste que só queriam 1 ou 2 seções ganham estas no fim.
const more = () => [steps({ title: 'Partes' }), timeline({ title: 'Marcos' })];

const answer = (data: Record<string, unknown>) => JSON.stringify(data);

describe('parseInfographic', () => {
  it('when the answer is a valid story, should return the cover, the sections and the closing', () => {
    const parsed = parseInfographic(answer(story()));

    expect(parsed).toMatchObject({
      kicker: 'Tecnologia',
      title: 'Como a internet funciona',
      subtitle: 'Do código à tela',
      intro: 'Uma rede de redes.',
      piece: 'tecnologia.wifi',
      takeaways: ['Lembre 1', 'Lembre 2'],
    });
    expect(parsed.sections.map((section) => section.layout)).toEqual([
      'steps',
      'timeline',
      'steps',
      'timeline',
    ]);
    expect(parsed.sections[0].items[0]).toEqual({
      piece: 'tecnologia.chip',
      title: 'Etapa 1',
      text: 'Texto 1',
    });
    expect(parsed.sections[1].items[0].tag).toBe('1990');
  });

  it('when the JSON comes inside a code fence or with text around, should still parse it', () => {
    const text = `Aqui está:\n\`\`\`json\n${answer(story())}\n\`\`\`\nPronto.`;

    expect(parseInfographic(text).title).toBe('Como a internet funciona');
  });

  it.each([
    ['text without JSON', 'não consegui'],
    ['broken JSON', '{"title": "T", '],
    ['a JSON array', '[1, 2]'],
    ['no title', answer(story({ title: '  ' }))],
    ['no sections', answer(story({ sections: [] }))],
    ['sections that are not a list (and no loose section)', answer({ title: 'T', sections: 'x' })],
    [
      'only one section in the free mode (it is not a story)',
      answer(story({ sections: [steps()] })),
    ],
    [
      'sections that do not hold up (unknown layout, too few items)',
      answer(
        story({
          sections: [{ layout: 'pizza', title: 'X', items: items(3) }, steps({ items: items(1) })],
        }),
      ),
    ],
  ])('when the answer is %s, should throw InvalidInfographicError', (_name, text) => {
    expect(() => parseInfographic(text)).toThrow(InvalidInfographicError);
  });

  it('when there are too many sections, should keep only the allowed number', () => {
    const many = Array.from({ length: 9 }, () => steps());

    expect(parseInfographic(answer(story({ sections: many }))).sections).toHaveLength(
      INFOGRAPHIC_SECTIONS.max,
    );
  });

  it('when one section is invalid, should drop only that one and keep the story', () => {
    const parsed = parseInfographic(
      answer(
        story({
          sections: [
            steps(),
            { layout: 'pizza', title: 'X', items: items(3) },
            timeline(),
            ...more(),
          ],
        }),
      ),
    );

    expect(parsed.sections.map((section) => section.layout)).toEqual([
      'steps',
      'timeline',
      'steps',
      'timeline',
    ]);
  });

  it('when a section has no title or too few items for its layout, should drop it', () => {
    const parsed = parseInfographic(
      answer(
        story({
          sections: [
            steps({ title: '' }),
            steps({ items: items(2) }),
            steps(),
            timeline(),
            ...more(),
          ],
        }),
      ),
    );

    expect(parsed.sections).toHaveLength(4);
  });

  it('when the cover has no optional fields, should return the title, a piece for the cover and the sections', () => {
    const parsed = parseInfographic(
      answer({ title: 'T', sections: [steps(), timeline(), ...more()] }),
    );

    expect(Object.keys(parsed).sort()).toEqual(['piece', 'sections', 'title']);
    expect(parsed.piece).not.toBe('');
  });

  describe('forced layout', () => {
    it('when the user chose a layout, should return exactly one section in that layout', () => {
      const parsed = parseInfographic(answer(story()), 'funnel');

      expect(parsed.sections).toHaveLength(1);
      expect(parsed.sections[0].layout).toBe('funnel');
    });

    it('when the AI answered with the section loose (no sections list), should read it as the only section', () => {
      const parsed = parseInfographic(
        answer({ title: 'Funil de vendas', items: items(4, { tag: '10' }) }),
        'funnel',
      );

      expect(parsed.sections).toHaveLength(1);
      expect(parsed.sections[0].items).toHaveLength(4);
    });

    it('when the chosen layout cannot be filled, should throw InvalidInfographicError', () => {
      expect(() =>
        parseInfographic(answer({ title: 'T', sections: [steps({ items: items(1) })] }), 'steps'),
      ).toThrow(InvalidInfographicError);
    });
  });

  it('when a piece key is not in the catalog, should not leave the space empty: a catalog piece that fits the text is chosen', () => {
    const parsed = parseInfographic(
      answer(
        story({
          piece: 'inventada.coisa',
          sections: [
            steps({
              piece: 'nao.existe',
              items: [
                item(1, { piece: 'nao.existe', title: 'Servidor', text: 'Guarda o site' }),
                item(2),
                item(3),
              ],
            }),
            timeline(),
            ...more(),
          ],
        }),
      ),
    );
    const keys = [
      parsed.piece,
      ...parsed.sections.flatMap((entry) => [entry.piece, ...entry.items.map((it) => it.piece)]),
    ];

    expect(parsed.piece).not.toBe('');
    expect(parsed.sections[0].items[0].piece).toBe('tecnologia.servidor');
    // a seção de passos não desenha peça própria: continua sem
    expect(parsed.sections[0].piece).toBe('');
    // o que a IA acertou fica como está
    expect(parsed.sections[0].items[1].piece).toBe('tecnologia.chip');
    for (const key of keys.filter((candidate) => candidate !== '')) {
      expect(INFOGRAPHIC_PIECE_KEYS.has(key)).toBe(true);
    }
  });

  it('when texts have markdown, extra spaces and final punctuation in a title, should clean them', () => {
    const parsed = parseInfographic(
      answer(
        story({
          title: '  **Como   funciona**.  ',
          sections: [
            steps({
              items: [{ title: ' **Servidor**: ', text: 'Guarda  o `site`' }, item(2), item(3)],
            }),
            timeline(),
            ...more(),
          ],
        }),
      ),
    );

    expect(parsed.title).toBe('Como funciona');
    expect(parsed.sections[0].items[0]).toMatchObject({ title: 'Servidor', text: 'Guarda o site' });
  });

  it('when a text is too long, should cut it at a whole word with an ellipsis', () => {
    const parsed = parseInfographic(
      answer(
        story({
          intro: 'palavra '.repeat(80),
          sections: [
            steps({ items: [{ title: 'A', text: 'palavra '.repeat(60) }, item(2), item(3)] }),
            timeline(),
            ...more(),
          ],
        }),
      ),
    );

    expect(parsed.intro?.length).toBeLessThanOrEqual(INFOGRAPHIC_LIMITS.maxIntroChars);
    expect(parsed.intro?.endsWith('palavra…')).toBe(true);
    expect(parsed.sections[0].items[0].text.length).toBeLessThanOrEqual(
      INFOGRAPHIC_LIMITS.maxItemTextChars,
    );
  });

  it('when there are too many takeaways, should keep the allowed number and drop empty ones', () => {
    const parsed = parseInfographic(
      answer(story({ takeaways: ['a', '', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] })),
    );

    expect(parsed.takeaways).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('when there are too many tips in a section, should keep only the allowed number', () => {
    const parsed = parseInfographic(
      answer(
        story({
          sections: [steps({ tips: ['a', '', 'b', 'c', 'd', 'e', 'f'] }), timeline(), ...more()],
        }),
      ),
    );

    expect(parsed.sections[0].tips).toEqual(['a', 'b', 'c', 'd']);
  });

  it('when a section has more items than its layout allows, should cut the extra ones', () => {
    const parsed = parseInfographic(
      answer(story({ sections: [steps({ items: items(9) }), timeline(), ...more()] })),
    );

    expect(parsed.sections[0].items).toHaveLength(5);
  });

  describe('versus', () => {
    const versus = (extra: Record<string, unknown> = {}) => ({
      layout: 'versus',
      title: 'A contra B',
      sides: [
        { piece: 'transporte.carro', title: 'Elétrico' },
        { piece: 'transporte.posto', title: 'Combustão' },
      ],
      items: [
        { title: 'Custo', text: 'Menor', extra: 'Maior', winner: 'A' },
        { title: 'Manutenção', text: 'Simples', extra: 'Mais peças', winner: 'b' },
        { title: 'Emissões', text: 'Zero', extra: 'Alta', winner: 'talvez' },
      ],
      ...extra,
    });
    const withVersus = (extra: Record<string, unknown> = {}) =>
      answer(story({ sections: [steps(), versus(extra), ...more()] }));

    it('when the section has two sides and criteria, should keep the sides, the B text and the winner', () => {
      const section = parseInfographic(withVersus()).sections[1];

      expect(section.sides).toEqual([
        { piece: 'transporte.carro', title: 'Elétrico' },
        { piece: 'transporte.posto', title: 'Combustão' },
      ]);
      expect(section.items[0]).toMatchObject({ extra: 'Maior', winner: 'a' });
      expect(section.items[1].winner).toBe('b');
    });

    it('when the winner is not a, b or tie, should leave it out', () => {
      expect(parseInfographic(withVersus()).sections[1].items[2].winner).toBeUndefined();
    });

    it('when the sides are missing, should drop the section but keep the rest of the story', () => {
      const parsed = parseInfographic(
        answer(
          story({
            sections: [
              steps(),
              timeline(),
              versus({ sides: [{ piece: '', title: 'Só um' }] }),
              ...more(),
            ],
          }),
        ),
      );

      expect(parsed.sections.map((section) => section.layout)).toEqual([
        'steps',
        'timeline',
        'steps',
        'timeline',
      ]);
    });

    it('when there are more than two sides, should keep the first two', () => {
      const parsed = parseInfographic(
        withVersus({
          sides: [
            { piece: '', title: 'A' },
            { piece: '', title: 'B' },
            { piece: '', title: 'C' },
          ],
        }),
      );

      expect(parsed.sections[1].sides?.map((side) => side.title)).toEqual(['A', 'B']);
    });
  });

  describe('ranking', () => {
    const ranking = (extra: Record<string, unknown> = {}) => ({
      layout: 'ranking',
      title: 'Top',
      meterLabel: 'Intensidade',
      items: [item(1, { value: 150 }), item(2, { value: -5 }), item(3, { value: 'x' })],
      ...extra,
    });

    it('when values are outside 0 to 100 or missing, should clamp them and default to 50', () => {
      const section = parseInfographic(answer(story({ sections: [steps(), ranking(), ...more()] })))
        .sections[1];

      expect(section.items.map((entry) => entry.value)).toEqual([100, 0, 50]);
      expect(section.meterLabel).toBe('Intensidade');
    });

    it('when the layout is not a ranking, should not keep value nor meterLabel', () => {
      const parsed = parseInfographic(
        answer(
          story({
            sections: [
              steps({ meterLabel: 'X', items: items(3, { value: 10 }) }),
              timeline(),
              ...more(),
            ],
          }),
        ),
      );

      expect(parsed.sections[0].items[0].value).toBeUndefined();
      expect(parsed.sections[0].meterLabel).toBeUndefined();
    });
  });

  describe('numbers', () => {
    it('when an item has only a value and a text, should keep it', () => {
      const parsed = parseInfographic(
        answer(
          story({
            sections: [
              steps(),
              {
                layout: 'numbers',
                title: 'Sono',
                items: [
                  { tag: '7-9 h', text: 'de sono' },
                  { tag: '90 min', text: 'por ciclo' },
                  { tag: '4-6', text: 'ciclos' },
                ],
              },
              ...more(),
            ],
          }),
        ),
      );

      expect(parsed.sections[1].items.map((entry) => entry.tag)).toEqual([
        '7-9 h',
        '90 min',
        '4-6',
      ]);
    });
  });

  it('when the layout is the cycle, should require exactly four items', () => {
    const cycle = (count: number) => ({ layout: 'cycle', title: 'Ciclo', items: items(count) });

    expect(
      parseInfographic(answer(story({ sections: [steps(), cycle(6), ...more()] }))).sections[1]
        .items,
    ).toHaveLength(4);
    const dropped = parseInfographic(
      answer(story({ sections: [steps(), timeline(), cycle(3), ...more()] })),
    );

    expect(dropped.sections.map((section) => section.layout)).not.toContain('cycle');
  });
});
