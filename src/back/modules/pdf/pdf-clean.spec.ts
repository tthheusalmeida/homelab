import { cleanPages } from './pdf-clean';

const pageWith = (n: number, body: string[]): string[] => [
  'Livro de Teste',
  ...body,
  `Página ${n} de 10`,
];

describe('cleanPages', () => {
  it('when a page has only a page number line, should drop it', () => {
    expect(cleanPages([['Texto da página.', '12']])).toEqual(['Texto da página.']);
  });

  it.each(['- 7 -', 'Página 7', 'pág. 7', 'Page 7 of 10', '7/10'])(
    'when a line looks like a page number (%s), should drop it',
    (line) => {
      expect(cleanPages([['Texto real.', line]])).toEqual(['Texto real.']);
    },
  );

  it('when a line is only a number inside a sentence, should keep it', () => {
    expect(cleanPages([['Em 2024 foram 12 casos.']])).toEqual(['Em 2024 foram 12 casos.']);
  });

  it('when the same header repeats on many pages, should remove it from all of them', () => {
    const topics = ['alfa', 'bravo', 'charlie', 'delta', 'eco'];
    const pages = topics.map((topic, i) =>
      pageWith(i + 1, [
        `Primeiro trecho sobre ${topic}.`,
        `Segundo trecho sobre ${topic} aqui.`,
        `Terceiro trecho sobre ${topic} ali.`,
        `Quarto trecho sobre ${topic} lá.`,
      ]),
    );

    const result = cleanPages(pages);

    expect(result).toHaveLength(5);
    result.forEach((text, index) => {
      expect(text).toContain(`Primeiro trecho sobre ${topics[index]}.`);
      expect(text).not.toContain('Livro de Teste');
      expect(text).not.toContain('Página ');
    });
  });

  it('when the document has few pages, should not guess headers and keep repeated lines', () => {
    const pages = [1, 2].map((n) => pageWith(n, [`Conteúdo ${n}.`]));

    expect(cleanPages(pages)[0]).toContain('Livro de Teste');
  });

  it('when a repeated line is in the middle of the page, should keep it', () => {
    const pages = [1, 2, 3, 4, 5].map((n) => [
      `Abertura ${n}.`,
      'Linha 1 do corpo.',
      'Frase repetida no meio.',
      'Linha 3 do corpo.',
      `Fechamento ${n}.`,
    ]);

    expect(cleanPages(pages)[0]).toContain('Frase repetida no meio.');
  });

  it('when a word is hyphenated at the end of a line, should rejoin it', () => {
    const text = cleanPages([['Esta é uma pala-', 'vra quebrada no fim da linha.']])[0];

    expect(text).toBe('Esta é uma palavra quebrada no fim da linha.');
  });

  it('when a hyphen is followed by an uppercase word, should keep the hyphen', () => {
    const text = cleanPages([['Rio de Janeiro-', 'Brasil e depois mais texto.']])[0];

    expect(text).toContain('Janeiro- Brasil');
  });

  it('when lines belong to the same sentence, should join them with a space', () => {
    const text = cleanPages([
      ['Esta frase é longa e ocupa a linha inteira da página sim', 'e continua aqui.'],
    ])[0];

    expect(text).toBe('Esta frase é longa e ocupa a linha inteira da página sim e continua aqui.');
  });

  it('when a short line ends a sentence, should start a new paragraph', () => {
    const text = cleanPages([
      [
        'Uma linha bem comprida que ocupa toda a largura disponível da página aqui.',
        'Fim curto.',
        'Outro parágrafo começa aqui.',
      ],
    ])[0];

    expect(text.split('\n\n')).toEqual([
      'Uma linha bem comprida que ocupa toda a largura disponível da página aqui. Fim curto.',
      'Outro parágrafo começa aqui.',
    ]);
  });

  it('when lines are list items, should keep each item as its own paragraph', () => {
    const text = cleanPages([['Itens:', '- primeiro', '- segundo', '1. terceiro']])[0];

    expect(text.split('\n\n')).toEqual(['Itens:', '- primeiro', '- segundo', '1. terceiro']);
  });

  it('when a page has no text, should return an empty string for it', () => {
    expect(cleanPages([[], ['   '], ['Algo.']])).toEqual(['', '', 'Algo.']);
  });

  it('when lines have extra spaces, should collapse them', () => {
    expect(cleanPages([['  muitos     espaços   aqui  ']])).toEqual(['muitos espaços aqui']);
  });
});
