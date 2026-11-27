import { Bm25Index, type IndexedFields, type QueryTerm } from './bm25-index';

const fields = (body: string, title = '', headings = ''): IndexedFields => ({
  title: title ? title.split(' ') : [],
  headings: headings ? headings.split(' ') : [],
  body: body ? body.split(' ') : [],
});

const exact = (...terms: string[]): QueryTerm[] =>
  terms.map((term) => ({ alternatives: [{ term, weight: 1 }] }));

describe('Bm25Index', () => {
  it('when the index is empty, should find nothing', () => {
    expect(new Bm25Index().search(exact('fluxo'), 5)).toEqual([]);
  });

  it('when no term is in the index, should find nothing', () => {
    const index = new Bm25Index();

    index.add('a', fields('fluxo valor'));

    expect(index.search(exact('inexistente'), 5)).toEqual([]);
  });

  it('when a chunk has the term, should return it', () => {
    const index = new Bm25Index();

    index.add('a', fields('fluxo valor'));
    index.add('b', fields('feedback rapido'));

    expect(index.search(exact('fluxo'), 5).map((match) => match.id)).toEqual(['a']);
  });

  it('when one term is rare and the other common, should rank the rare match first', () => {
    const index = new Bm25Index();

    index.add('comum', fields('trabalho trabalho trabalho'));
    index.add('raro', fields('kanban trabalho'));
    index.add('outro', fields('trabalho equipe'));
    index.add('mais', fields('trabalho processo'));

    const [first] = index.search(exact('kanban', 'trabalho'), 5);

    expect(first.id).toBe('raro');
  });

  it('when the term is also in a heading, should rank above the same body match without it', () => {
    const index = new Bm25Index();

    index.add('so-corpo', fields('feedback outro texto aqui'));
    index.add('com-cabecalho', fields('feedback outro texto aqui', '', 'feedback'));

    expect(index.search(exact('feedback'), 5)[0].id).toBe('com-cabecalho');
  });

  it('when the term is also in the page title, should rank above the same body match without it', () => {
    const index = new Bm25Index();

    index.add('so-corpo', fields('feedback outro texto aqui'));
    index.add('com-titulo', fields('feedback outro texto aqui', 'feedback'));

    expect(index.search(exact('feedback'), 5)[0].id).toBe('com-titulo');
  });

  it('when the term is only in a heading, should still find the chunk', () => {
    const index = new Bm25Index();

    index.add('so-cabecalho', fields('', '', 'feedback'));
    index.add('outro', fields('nada a ver'));

    expect(index.search(exact('feedback'), 5).map((match) => match.id)).toEqual(['so-cabecalho']);
  });

  it('when a short chunk only repeats the title, should rank below the chunk that explains it', () => {
    const index = new Bm25Index();

    index.add('introducao', fields('resumo geral', 'primeir maneir', 'primeir maneir'));
    index.add(
      'explicacao',
      fields(
        'primeir maneir enfatiza desempenho sistema todo desenvolvimento ate operacao',
        'primeir maneir',
        'primeir maneir fluxo trabalho',
      ),
    );

    expect(index.search(exact('primeir', 'maneir'), 5)[0].id).toBe('explicacao');
  });

  it('when a chunk matches more of the question, should rank it first', () => {
    const index = new Bm25Index();

    index.add('um', fields('primeira coisa qualquer'));
    index.add('dois', fields('primeira maneira devop'));

    const [first] = index.search(exact('primeira', 'maneira', 'devop'), 5);

    expect(first).toMatchObject({ id: 'dois', matchedTerms: 3 });
  });

  it('when two question words appear side by side and in order, should rank that chunk first', () => {
    const index = new Bm25Index();

    index.add('separado', fields('primeira vez que vi a maneira'));
    index.add('junto', fields('a primeira maneira de fazer'));

    expect(index.search(exact('primeira', 'maneira'), 5)[0].id).toBe('junto');
  });

  it('when a term has corrected forms, should match any of them and count it once', () => {
    const index = new Bm25Index();

    index.add('a', fields('devop pratica'));

    const [match] = index.search(
      [
        {
          alternatives: [
            { term: 'devosp', weight: 1 },
            { term: 'devop', weight: 0.5 },
          ],
        },
      ],
      5,
    );

    expect(match).toMatchObject({ id: 'a', matchedTerms: 1 });
  });

  it('when a corrected form has less weight, should score below the exact word', () => {
    const index = new Bm25Index();

    index.add('a', fields('devop pratica outra'));
    index.add('b', fields('devopss pratica outra'));

    const matches = index.search(
      [
        {
          alternatives: [
            { term: 'devop', weight: 1 },
            { term: 'devopss', weight: 0.5 },
          ],
        },
      ],
      5,
    );

    expect(matches.map((match) => match.id)).toEqual(['a', 'b']);
  });

  it('when there are more matches than the limit, should return only the best ones', () => {
    const index = new Bm25Index();

    for (let i = 0; i < 10; i += 1) {
      index.add(`c${i}`, fields('fluxo'));
    }

    expect(index.search(exact('fluxo'), 3)).toHaveLength(3);
  });

  it('when asked for the vocabulary, should give how many chunks have each term', () => {
    const index = new Bm25Index();

    index.add('a', fields('fluxo valor'));
    index.add('b', fields('fluxo', '', 'valor'));

    expect(index.vocabulary()).toEqual(
      new Map([
        ['fluxo', 2],
        ['valor', 2],
      ]),
    );
  });
});
