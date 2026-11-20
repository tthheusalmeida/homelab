import type { ParsedInfographic } from './infographic';
import { fillMissingPieces, PieceResolver } from './infographic-pieces';

import { INFOGRAPHIC_PIECE_KEYS } from '../../../../shared/infographic-pieces';

describe('PieceResolver', () => {
  it('when the text mentions a piece by name, should choose that piece', () => {
    expect(new PieceResolver(null).resolve('A calculadora do orçamento')).toBe(
      'financas.calculadora',
    );
  });

  it('when the text matches only a keyword of a piece, should still find it', () => {
    expect(new PieceResolver(null).resolve('Dívida e juros crescem')).toBe('financas.moedas');
  });

  it('when the words have different endings, should match by the stem of the word', () => {
    // "endividamento" não está nas tags, mas "dívida"/"investimento" têm raízes parecidas
    const key = new PieceResolver(null).resolve('Aprender com a vacinação em massa');

    expect(key).toBe('saude.seringa');
  });

  it('when accents and case differ, should ignore them', () => {
    expect(new PieceResolver(null).resolve('ÁGUA e CHUVA')).toBe('natureza.chuva');
  });

  it('when the same piece was already used, should prefer another one that also fits', () => {
    const resolver = new PieceResolver(null);
    const first = resolver.resolve('dinheiro');
    const second = resolver.resolve('dinheiro');

    expect(second).not.toBe(first);
  });

  it('when two pieces tie, should favor the one from the theme of the cover', () => {
    const economy = new PieceResolver('financas').resolve('valor');
    const other = new PieceResolver('jogos').resolve('moeda de jogo');

    expect(economy.startsWith('financas.')).toBe(true);
    expect(other.startsWith('jogos.')).toBe(true);
  });

  it('when nothing matches, should take an unused piece of the cover theme', () => {
    const resolver = new PieceResolver('musica');

    expect(resolver.resolve('xyzxyz qwerty').startsWith('musica.')).toBe(true);
  });

  it('when nothing matches and there is no theme, should take a generic piece', () => {
    expect(new PieceResolver(null).resolve('xyzxyz qwerty').startsWith('generico.')).toBe(true);
  });

  it('when the fallbacks run out, should still answer a valid piece', () => {
    const resolver = new PieceResolver(null);
    const keys = Array.from({ length: 10 }, () => resolver.resolve('xyzxyz'));

    for (const key of keys) {
      expect(INFOGRAPHIC_PIECE_KEYS.has(key)).toBe(true);
    }
  });

  it('when a piece was reserved, should avoid repeating it', () => {
    const resolver = new PieceResolver(null);

    resolver.reserve('financas.calculadora');

    expect(resolver.resolve('calculadora e orçamento')).not.toBe('financas.calculadora');
  });
});

const item = (title: string, text: string, piece = '') => ({ piece, title, text });

function parsed(patch: Partial<ParsedInfographic> = {}): ParsedInfographic {
  return {
    title: 'O orçamento do Brasil',
    piece: 'financas.calculadora',
    sections: [
      {
        layout: 'numbers',
        title: 'Receitas e despesas',
        piece: '',
        note: 'Gastos públicos',
        items: [
          { piece: '', title: '', text: 'Receita total em relação ao PIB', tag: '40%' },
          { piece: '', title: '', text: 'Despesa total em relação ao PIB', tag: '47%' },
          { piece: '', title: '', text: 'Resultado do governo', tag: '-6,4%' },
        ],
      },
      {
        layout: 'cycle',
        title: 'O ciclo da dívida',
        piece: '',
        items: [
          item('Arrecadação', 'O governo cobra impostos'),
          item('Gastos', 'Recursos são gastos'),
          item('Custo da dívida', 'Os juros acumulam'),
          item('Novo endividamento', 'O ciclo se repete'),
        ],
      },
    ],
    ...patch,
  };
}

describe('fillMissingPieces', () => {
  it('when the AI only picked the cover piece, should fill every item with a piece from the catalog', () => {
    const filled = fillMissingPieces(parsed());

    for (const section of filled.sections) {
      for (const entry of section.items) {
        expect(INFOGRAPHIC_PIECE_KEYS.has(entry.piece)).toBe(true);
      }
    }
  });

  it('when filling, should not repeat a piece inside the infographic', () => {
    const filled = fillMissingPieces(parsed());
    const keys = [
      filled.piece,
      ...filled.sections.flatMap((section) => section.items.map((entry) => entry.piece)),
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('when the AI chose a piece right, should keep it and not reuse it elsewhere', () => {
    const filled = fillMissingPieces(
      parsed({
        sections: [
          {
            layout: 'steps',
            title: 'Etapas',
            piece: '',
            items: [
              item('Calculadora', 'Faz as contas', 'financas.cartao'),
              item('Calculadora de novo', 'Mais contas'),
              item('Contas', 'Orçamento'),
            ],
          },
        ],
      }),
    );

    expect(filled.sections[0].items[0].piece).toBe('financas.cartao');
    expect(filled.sections[0].items[1].piece).not.toBe('financas.cartao');
  });

  it('when the cover has no piece, should choose one from the title', () => {
    const filled = fillMissingPieces(parsed({ piece: '', title: 'Dívida e orçamento público' }));

    expect(INFOGRAPHIC_PIECE_KEYS.has(filled.piece)).toBe(true);
    expect(filled.piece.startsWith('financas.')).toBe(true);
  });

  it('when a layout draws the piece of the section, should fill it (and only then)', () => {
    const filled = fillMissingPieces(parsed());

    expect(filled.sections[0].piece).not.toBe(''); // números: a peça da observação
    expect(filled.sections[1].piece).toBe(''); // ciclo: o centro é fixo
  });

  it('when the section is a comparison, should fill the sides and leave the criteria without pieces', () => {
    const filled = fillMissingPieces(
      parsed({
        sections: [
          {
            layout: 'versus',
            title: 'A ou B',
            piece: '',
            sides: [
              { piece: '', title: 'Cartão de crédito' },
              { piece: '', title: 'Dinheiro na carteira' },
            ],
            items: [
              { piece: '', title: 'Custo', text: 'x', extra: 'y' },
              { piece: '', title: 'Prazo', text: 'x', extra: 'y' },
              { piece: '', title: 'Risco', text: 'x', extra: 'y' },
            ],
          },
        ],
      }),
    );

    expect(filled.sections[0].sides?.map((side) => side.piece)).toEqual([
      'financas.cartao',
      'financas.carteira',
    ]);
    expect(filled.sections[0].items.every((entry) => entry.piece === '')).toBe(true);
  });

  it('when everything is already filled, should leave the infographic as it is', () => {
    const complete = parsed({
      sections: [
        {
          layout: 'steps',
          title: 'Etapas',
          piece: '',
          items: [
            item('A', 'a', 'tecnologia.chip'),
            item('B', 'b', 'tecnologia.nuvem'),
            item('C', 'c', 'tecnologia.servidor'),
          ],
        },
      ],
    });

    expect(fillMissingPieces(complete)).toEqual(complete);
  });
});
