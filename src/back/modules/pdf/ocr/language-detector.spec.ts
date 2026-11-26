import { detectLanguages } from './language-detector';

const PT =
  'A psicologia comunitária estuda a relação das pessoas com o território onde elas vivem. Os alunos devem elaborar um projeto para a comunidade, que será entregue no final da unidade.';
const EN =
  'The students must write a project for the community, which will be delivered at the end of the unit. This is what they have been asked to do by the teacher.';
const FR =
  'Les élèves doivent écrire un projet pour la communauté, qui sera remis à la fin de cette unité. Il est important de bien lire les consignes avant de commencer.';

describe('detectLanguages', () => {
  it('when the text is in Portuguese, should return only Portuguese', () => {
    expect(detectLanguages(PT)).toEqual([{ language: 'por', share: 1 }]);
  });

  it.each([
    ['English', EN, 'eng'],
    ['French', FR, 'fra'],
  ])('when the text is in %s, should return that language first', (_name, text, language) => {
    expect(detectLanguages(text)[0]?.language).toBe(language);
  });

  it('when the text has no accents (as a weak reader may produce), should still find the language', () => {
    const unaccented = PT.normalize('NFD').replace(/[̀-ͯ]/g, '');

    expect(detectLanguages(unaccented)[0]?.language).toBe('por');
  });

  it('when a lesson mixes French examples with Portuguese explanations, should return both languages', () => {
    const lesson = [PT, FR, PT, FR, PT].join('\n');
    const languages = detectLanguages(lesson).map((entry) => entry.language);

    expect(languages).toContain('por');
    expect(languages).toContain('fra');
  });

  it('when a single stray line looks like another language, should not add that language', () => {
    const text = [PT, PT, PT, PT, 'il est tres bien que nous soyons ici'].join('\n');

    expect(detectLanguages(text).map((entry) => entry.language)).toEqual(['por']);
  });

  it('when the languages share words, should rank by how much of the text each covers', () => {
    const [first, second] = detectLanguages([PT, PT, PT, EN].join('\n'));

    expect(first?.language).toBe('por');
    expect(second?.language).toBe('eng');
    expect(first!.share).toBeGreaterThan(second!.share);
  });

  it('when asking for at most one language, should return only the main one', () => {
    expect(detectLanguages([PT, EN, EN].join('\n'), { maxLanguages: 1 })).toHaveLength(1);
  });

  it('when a language is below the minimum share, should leave it out', () => {
    const text = [PT, PT, PT, PT, PT, PT, EN, EN].join('\n');

    expect(detectLanguages(text, { minShare: 0.6 }).map((entry) => entry.language)).toEqual([
      'por',
    ]);
  });

  it.each([
    ['empty text', ''],
    ['too few words', 'oi tudo'],
    ['a script the app does not know', 'Привет мир это тестовый текст на русском языке'],
  ])('when the text is %s, should return no language', (_name, text) => {
    expect(detectLanguages(text)).toEqual([]);
  });
});
