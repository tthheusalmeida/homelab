import { INFOGRAPHIC_PIECES, INFOGRAPHIC_THEMES } from './infographic-pieces';
import {
  MIN_CONFIDENCE,
  MIN_THEMES,
  PROMPT_THEME_COUNT,
  selectRelevantThemes,
} from './infographic-themes';

const DRONES =
  'Foi aprovado um projeto de lei que torna crime o uso de drones para sobrevoar presídios. A medida combate o crime organizado, que usa drones para entregar armas, celulares e drogas nas unidades prisionais. A pena prevê prisão e multa.';

const FINANCE =
  'Orçamento público, impostos, dívida e inflação. O governo arrecada, gasta e investe dinheiro; juros altos aumentam a dívida e o déficit.';

const NETWORKS =
  'Redes de computadores: uma rede liga computadores, celulares e servidores. A internet é a maior rede. Os dados viajam em pacotes por roteadores e cabos, e cada computador tem um endereço IP. Os protocolos como TCP e HTTP definem como os dados são enviados. O servidor responde ao navegador do usuário. A segurança da rede usa senha, criptografia e firewall. Backup e atualização do software evitam falhas e ataques de hackers.';

describe('selectRelevantThemes', () => {
  it('when the summary is about drones in prisons, should pick the justice and technology themes first', () => {
    const themes = selectRelevantThemes(DRONES);

    expect(themes?.[0]).toBe('justica');
    expect(themes).toContain('tecnologia');
  });

  it('when the summary is about public finances, should put finance first', () => {
    expect(selectRelevantThemes(FINANCE)?.[0]).toBe('financas');
  });

  it('when the summary is about food, should put food first', () => {
    expect(
      selectRelevantThemes(
        'Receita de bolo: farinha, ovos, açúcar e leite. Asse no forno e sirva com café.',
      )?.[0],
    ).toBe('alimentacao');
  });

  it('when the summary is about computer networks, should put technology first', () => {
    expect(selectRelevantThemes(NETWORKS)?.[0]).toBe('tecnologia');
  });

  it('when the text has accents and capital letters, should read it the same as plain text', () => {
    expect(selectRelevantThemes(DRONES.toUpperCase())).toEqual(selectRelevantThemes(DRONES));
    expect(selectRelevantThemes('PRESÍDIOS, CRIME e DRONES e LEGISLAÇÃO')).toEqual(
      selectRelevantThemes('presidios, crime e drones e legislacao'),
    );
  });

  it('when there is a signal, should return at least the minimum and at most the maximum number of themes', () => {
    const themes = selectRelevantThemes(DRONES) ?? [];

    expect(themes.length).toBeGreaterThanOrEqual(MIN_THEMES);
    expect(themes.length).toBeLessThanOrEqual(PROMPT_THEME_COUNT);
    expect(selectRelevantThemes(DRONES, 2)).toHaveLength(2);
  });

  it('when selecting, should never list the generic theme (it always comes along in the catalog)', () => {
    expect(selectRelevantThemes(DRONES)).not.toContain('generico');
    expect(
      selectRelevantThemes('estrela brilho bandeira seta alerta coração engrenagem') ?? [],
    ).not.toContain('generico');
  });

  it.each([
    ['nothing from the bank', 'zzz qqq www'],
    ['an empty text', ''],
    ['a few words only', '## Camadas\n- TCP: transporte\n- IP: endereçamento'],
  ])(
    'when the summary has %s, should give no selection so the prompt carries the whole bank',
    (_name, text) => {
      expect(selectRelevantThemes(text)).toBeNull();
    },
  );

  it('when a word is repeated far beyond the cap, should not count more than at the cap', () => {
    expect(selectRelevantThemes('crime '.repeat(3))).toEqual(
      selectRelevantThemes('crime '.repeat(300)),
    );
  });

  it('when the same text is read twice, should give the same answer (no randomness)', () => {
    expect(selectRelevantThemes(NETWORKS)).toEqual(selectRelevantThemes(NETWORKS));
  });

  it('when the summary is huge, should still answer quickly', () => {
    const started = Date.now();

    selectRelevantThemes(`${DRONES} `.repeat(20_000));

    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('when the minimum confidence is read, should be a score a handful of real words can reach', () => {
    expect(MIN_CONFIDENCE).toBeGreaterThan(0);
    expect(MIN_CONFIDENCE).toBeLessThan(5);
  });

  it.each(Object.keys(INFOGRAPHIC_THEMES).filter((theme) => theme !== 'generico'))(
    'when a text lists the names of %s pieces, should include that theme among the picked ones',
    (theme) => {
      const names = INFOGRAPHIC_PIECES.filter((piece) => piece.theme === theme)
        .slice(0, 10)
        .map((piece) => piece.name)
        .join(', ');

      expect(selectRelevantThemes(names)).toContain(theme);
    },
  );
});
