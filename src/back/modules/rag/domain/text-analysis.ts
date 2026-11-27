/**
 * Análise de texto da busca: transforma um texto em uma lista de "termos" comparáveis. O mesmo
 * caminho vale para as páginas e para a pergunta, então "Maneiras", "maneira" e "MANEIRA" viram
 * o mesmo termo. Sem modelo nenhum: só regras simples, rápidas e testáveis.
 */

/** Minúsculas e sem acento: "Ação" → "acao". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Palavras que quase todo texto tem e não ajudam a achar nada ("de", "o", "que"), mais as que
 * sobram em perguntas ("o que diz", "me explique"). Em português e em inglês, já sem acento.
 */
const STOPWORDS = new Set(
  (
    'a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem sob sobre ' +
    'entre ate ao aos e ou mas nem que se como quando onde qual quais quem porque pois porem ' +
    'ja so tambem muito mais menos ser sao era foi ter tem tinha ha esta estao estava este esta ' +
    'esse essa esses essas isto isso aquilo seu sua seus suas meu minha eu voce nos eles elas ele ela ' +
    'me te lhe nao sim diz dizer fala falar falam explica explique explicar mostra mostre ' +
    'pode posso podem preciso quero gostaria saber algo alguma algum ' +
    'oi ola tudo bem obrigado obrigada valeu tchau vamos temos assim entao agora favor ' +
    'the of and to in is it that for on as with by an be this are or at from not but ' +
    'what which who how does do did about tell me'
  ).split(' '),
);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/** Palavras do texto, já normalizadas (letras e números). Pedaços de 1 letra são descartados. */
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 || /^\d$/.test(token));
}

const MIN_STEM_LENGTH = 3;

/** Plural → singular ("maneiras" → "maneira", "informacoes" → "informacao", "itens" → "item"). */
function reducePlural(word: string): string {
  if (word.length < 4 || !word.endsWith('s') || word.endsWith('ss') || word.endsWith('us')) {
    return word;
  }

  if (word.endsWith('oes') || word.endsWith('aes')) {
    return `${word.slice(0, -3)}ao`;
  }

  const swaps: ReadonlyArray<readonly [string, string]> = [
    ['ais', 'al'],
    ['eis', 'el'],
    ['ois', 'ol'],
    ['ns', 'm'],
  ];

  for (const [from, to] of swaps) {
    if (word.endsWith(from)) {
      return `${word.slice(0, -from.length)}${to}`;
    }
  }

  if (word.endsWith('res') || word.endsWith('zes')) {
    return word.slice(0, -2);
  }

  return word.slice(0, -1);
}

/** Terminações comuns que não mudam o assunto da palavra, da maior para a menor. */
const SUFFIXES = [
  'amente',
  'amento',
  'imento',
  'encia',
  'ancia',
  'idade',
  'adora',
  'mente',
  'acao',
  'ador',
  'ismo',
  'ista',
  'avel',
  'ivel',
  'ente',
  'ante',
  'aram',
  'eram',
  'iram',
  'ando',
  'endo',
  'indo',
  'oso',
  'osa',
  'ivo',
  'iva',
  'ado',
  'ada',
  'ido',
  'ida',
  'ar',
  'er',
  'ir',
] as const;

/**
 * Radical da palavra, sem dicionário: tira o plural, uma terminação comum e a vogal final. Não
 * precisa ser linguisticamente perfeito, só **igual** para quem escreve e para quem pergunta.
 */
export function stem(token: string): string {
  if (/^\d+$/.test(token) || token.length <= MIN_STEM_LENGTH) {
    return token;
  }

  let word = reducePlural(token);

  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM_LENGTH) {
      word = word.slice(0, -suffix.length);
      break;
    }
  }

  if (word.length > 4 && /[aeo]$/.test(word)) {
    word = word.slice(0, -1);
  }

  return word;
}

/** Texto → termos de busca (palavras úteis, no radical), na ordem em que aparecem. */
export function analyze(text: string): string[] {
  return tokenize(text)
    .filter((token) => !isStopword(token))
    .map(stem);
}

/**
 * Distância de edição com troca de letras vizinhas ("devosp" → "devops" = 1). Devolve
 * `max + 1` assim que passa do limite, sem calcular o resto.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1;
  }

  const rows: number[][] = [];

  for (let i = 0; i <= a.length; i += 1) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    rows[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    let rowMin = Infinity;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2][j - 2] + 1);
      }

      rows[i][j] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > max) {
      return max + 1;
    }
  }

  return rows[a.length][b.length];
}
