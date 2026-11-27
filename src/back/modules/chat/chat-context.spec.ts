import {
  groupBySection,
  referencesFor,
  saysNotFound,
  withContext,
  withoutCitations,
  type ChatContextPassage,
} from './chat-context';

const passage = (overrides: Partial<ChatContextPassage> = {}): ChatContextPassage => ({
  documentId: 'doc-1',
  title: 'Práticas da Primeira Maneira',
  category: ['DevOps'],
  headingPath: ['Práticas da Primeira Maneira', 'Fluxo de trabalho'],
  anchor: 'fluxo-de-trabalho',
  text: 'A Primeira Maneira enfatiza o fluxo.',
  ...overrides,
});

describe('withContext', () => {
  it('when there are no passages, should return the question untouched', () => {
    expect(withContext('o que é devops?', [])).toBe('o que é devops?');
  });

  it('when there are passages, should number them with page and section and end with the question', () => {
    const text = withContext('o que diz a primeira maneira?', [
      passage(),
      passage({ documentId: 'doc-2', title: 'Segunda', headingPath: [], text: 'Feedback.' }),
    ]);

    expect(text).toContain(
      '[1] Práticas da Primeira Maneira › Fluxo de trabalho\nA Primeira Maneira',
    );
    expect(text).toContain('[2] Segunda\nFeedback.');
    expect(text.endsWith('Pergunta: o que diz a primeira maneira?')).toBe(true);
  });

  it('when there are passages, should ask the model to cite the numbers', () => {
    expect(withContext('x', [passage()])).toContain('cite o número, como [1]');
  });

  it('when the excerpts help, should ask to prioritize them and cite the numbers', () => {
    const prompt = withContext('x', [passage()]);

    expect(prompt).toContain('dê prioridade a ele');
    expect(prompt).toContain('cite o número, como [1]');
  });

  it('when the excerpts are off topic, should let the model answer with what it knows, without citing or mentioning the pages', () => {
    const prompt = withContext('x', [passage()]);

    expect(prompt).toContain('ignore-os');
    expect(prompt).toContain('seu melhor conhecimento');
    expect(prompt).toContain('sem citar número e sem comentar que não achou nas páginas');
  });

  it('when building the prompt, should not hand the model a ready-made sentence to copy (small models repeat it)', () => {
    const prompt = withContext('x', [passage()]);

    expect(prompt).not.toMatch(/Não encontrei/i);
    expect(prompt).not.toMatch(/nas suas páginas/i);
  });

  it('when the excerpts only cover part of the question, should ask to say what is missing', () => {
    expect(withContext('x', [passage()])).toContain('complete com o que você sabe');
  });

  it('when the model answers, should be told to talk to the user directly and not mention excerpts', () => {
    const prompt = withContext('x', [passage()]);

    expect(prompt).toContain('segunda pessoa');
    expect(prompt).toContain('sem dizer "trechos fornecidos"');
  });
});

describe('referencesFor', () => {
  const passages = [
    passage(),
    passage({ documentId: 'doc-2', title: 'Segunda', headingPath: ['Segunda'], anchor: 'segunda' }),
    passage({ documentId: 'doc-3', title: 'Terceira', anchor: 'terceira' }),
  ];

  it('when the answer cites some passages, should list only the cited ones, numbered as the model saw them', () => {
    const references = referencesFor('Fala do fluxo [1] e do feedback [3].', passages);

    expect(references.map((reference) => [reference.documentId, reference.number])).toEqual([
      ['doc-1', 1],
      ['doc-3', 3],
    ]);
  });

  it('when the answer cites only one passage, should show only that one', () => {
    expect(referencesFor('Fala do fluxo [2].', passages).map((r) => r.documentId)).toEqual([
      'doc-2',
    ]);
  });

  it('when the answer cites none and the search is not sure, should list no reference at all', () => {
    expect(referencesFor('Resposta sem marcas.', passages)).toEqual([]);
    expect(referencesFor('Resposta sem marcas.', [passage({ coverage: 0.5 })])).toEqual([]);
  });

  it('when the answer cites none but the first passage matches almost the whole question, should list only the first one', () => {
    const references = referencesFor('Resposta sem marcas.', [
      passage({ coverage: 0.8 }),
      passage({ documentId: 'doc-2', anchor: 'outra', coverage: 1 }),
    ]);

    expect(references.map((reference) => reference.documentId)).toEqual(['doc-1']);
  });

  it('when the answer cites a number that does not exist, should ignore it', () => {
    expect(referencesFor('Veja [9].', passages)).toEqual([]);
  });

  it('when two passages come from the same section of a page, should list it once', () => {
    const references = referencesFor('[1] e [2]', [passage(), passage({ text: 'outro trecho' })]);

    expect(references).toHaveLength(1);
  });

  it('when two passages come from different sections of one page, should list both', () => {
    const references = referencesFor('[1] e [2]', [passage(), passage({ anchor: 'outra-secao' })]);

    expect(references.map((reference) => reference.anchor)).toEqual([
      'fluxo-de-trabalho',
      'outra-secao',
    ]);
  });

  it('when there are no passages, should return no references', () => {
    expect(referencesFor('Resposta [1].', [])).toEqual([]);
  });

  it('when a reference is built, should carry page, section path, anchor and category', () => {
    expect(referencesFor('[1]', [passage()])[0]).toEqual({
      documentId: 'doc-1',
      title: 'Práticas da Primeira Maneira',
      headingPath: ['Práticas da Primeira Maneira', 'Fluxo de trabalho'],
      anchor: 'fluxo-de-trabalho',
      category: ['DevOps'],
      number: 1,
    });
  });

  it('when two passages come from the same section, should be one reference numbered as the model saw it', () => {
    const references = referencesFor('Fala do fluxo [1] e do feedback [2].', [
      passage(),
      passage({ text: 'outro trecho da mesma seção' }),
      passage({ documentId: 'doc-2', anchor: 'outra' }),
    ]);

    expect(references.map((reference) => [reference.documentId, reference.number])).toEqual([
      ['doc-1', 1],
      ['doc-2', 2],
    ]);
  });

  it('when every passage is cited, should number them 1, 2, 3 in the order of the list', () => {
    const references = referencesFor('[1] [2] [3] [4]', [
      passage(),
      passage({ documentId: 'doc-2', anchor: 'b' }),
      passage({ documentId: 'doc-3', anchor: 'c' }),
      passage({ documentId: 'doc-4', anchor: 'd' }),
    ]);

    expect(references.map((reference) => reference.number)).toEqual([1, 2, 3, 4]);
  });

  it('when no citation exists and the first passage is strong, should show only the first one', () => {
    const references = referencesFor('Sem marcas.', [
      passage({ coverage: 0.9 }),
      passage({ documentId: 'doc-2', anchor: 'b' }),
    ]);

    expect(references.map((reference) => reference.documentId)).toEqual(['doc-1']);
  });

  it('when no citation exists and the first passage is strong, should number the references from 1', () => {
    expect(referencesFor('Sem marcas.', [passage({ coverage: 0.9 })])[0].number).toBe(1);
  });
});

describe('withoutCitations', () => {
  it('when the text has numbered citations, should remove them with the space before', () => {
    expect(withoutCitations('Fala do fluxo [1] e do feedback [2][3].')).toBe(
      'Fala do fluxo e do feedback.',
    );
  });

  it('when the text has markdown links or other brackets, should leave them alone', () => {
    expect(withoutCitations('Veja [o guia](http://x.y) e [anotação] [1]')).toBe(
      'Veja [o guia](http://x.y) e [anotação]',
    );
  });

  it('when the text has no citations, should return it unchanged', () => {
    expect(withoutCitations('Sem marcas.')).toBe('Sem marcas.');
  });
});

describe('saysNotFound', () => {
  it.each([
    'Não encontrei isso nas páginas.',
    'Baseado nos trechos fornecidos, **não foi possível encontrar** a resposta.',
    'Não há informações sobre isso nos trechos.',
    'Não tenho nada sobre telemetria aqui.',
    'Os trechos não tratam do assunto da pergunta.',
    'NÃO ENCONTREI nada',
  ])('when the answer opens with %s, should say it did not find', (answer) => {
    expect(saysNotFound(answer)).toBe(true);
  });

  it.each([
    'A Primeira Maneira trata do fluxo [1].',
    'O backup inclui a biblioteca e os chats [2].',
    'DORA é um grupo de pesquisa [1]. Não encontrei, porém, detalhes sobre o prazo.',
  ])('when the answer brings content first (%s), should not say it did not find', (answer) => {
    expect(saysNotFound(answer)).toBe(false);
  });

  it('when the not-found phrase only comes much later, should not count it', () => {
    const answer = `${'Conteúdo útil sobre o assunto. '.repeat(10)}Não encontrei mais nada.`;

    expect(saysNotFound(answer)).toBe(false);
  });
});

describe('referencesFor com resposta que diz não ter achado', () => {
  it('when the answer says it found nothing yet cites a passage, should list no references', () => {
    expect(referencesFor('Não encontrei isso nas páginas [1].', [passage()])).toEqual([]);
  });

  it('when the answer says it found nothing and the first passage is strong, should still list none', () => {
    expect(
      referencesFor('Não foi possível encontrar a resposta.', [passage({ coverage: 1 })]),
    ).toEqual([]);
  });
});

describe('groupBySection', () => {
  it('when passages share a section, should join their texts in order and keep one entry', () => {
    const grouped = groupBySection([
      passage({ text: 'primeiro' }),
      passage({ documentId: 'doc-2', anchor: 'x', text: 'de outra página' }),
      passage({ text: 'segundo' }),
    ]);

    expect(grouped.map((section) => section.text)).toEqual([
      'primeiro\n\nsegundo',
      'de outra página',
    ]);
  });

  it('when the same anchor exists in two pages, should not mix them', () => {
    const grouped = groupBySection([
      passage({ documentId: 'doc-1', anchor: 'resumo' }),
      passage({ documentId: 'doc-2', anchor: 'resumo' }),
    ]);

    expect(grouped).toHaveLength(2);
  });

  it('when grouping, should not change the passages it received', () => {
    const first = passage({ text: 'primeiro' });

    groupBySection([first, passage({ text: 'segundo' })]);

    expect(first.text).toBe('primeiro');
  });

  it('when there are no passages, should return an empty list', () => {
    expect(groupBySection([])).toEqual([]);
  });
});

describe('withContext numera as seções, igual à lista de referências', () => {
  it('when two passages are from the same section, should number them as one source', () => {
    const text = withContext('x', [
      passage({ text: 'trecho A' }),
      passage({ text: 'trecho B' }),
      passage({
        documentId: 'doc-2',
        title: 'Segunda',
        headingPath: [],
        anchor: null,
        text: 'trecho C',
      }),
    ]);

    expect(text).toContain(
      '[1] Práticas da Primeira Maneira › Fluxo de trabalho\ntrecho A\n\ntrecho B',
    );
    expect(text).toContain('[2] Segunda\ntrecho C');
    expect(text).not.toContain('[3]');
  });

  it('when the model cites the numbers it was given, should match the numbers of the references', () => {
    const passages = [
      passage({ text: 'trecho A' }),
      passage({ text: 'trecho B' }),
      passage({ documentId: 'doc-2', title: 'Segunda', headingPath: [], anchor: null }),
    ];
    const numbersInPrompt = [...withContext('x', passages).matchAll(/^\[(\d+)\] /gm)].map((m) =>
      Number(m[1]),
    );
    const numbersInReferences = referencesFor('Fala [1] e [2].', passages).map((r) => r.number);

    expect(numbersInPrompt).toEqual(numbersInReferences);
  });
});
