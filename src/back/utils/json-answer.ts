/**
 * Leitor tolerante do JSON que a IA devolve. A IA costuma errar um pouco o formato: cerca de código
 * em volta, texto antes ou depois, vírgula sobrando, comentários, quebra de linha solta dentro de um
 * texto e, nas respostas longas, o JSON **cortado no fim**. Em vez de recusar a resposta inteira,
 * este leitor acha o objeto, conserta esses defeitos e, se o fim foi cortado, fecha o que ficou
 * aberto (o que veio inteiro é aproveitado; quem usa ainda valida cada pedaço).
 */

const MAX_START_ATTEMPTS = 20;

/** Um comando do LaTeX (`\frac`, `\sqrt`, `\neq`): barra seguida de duas letras ou mais. */
const LATEX_COMMAND_START = /^[a-zA-Z]{2}/;

interface Frame {
  open: '{' | '[';
  /** Já passou o `:` do valor atual (só em objeto). */
  afterColon: boolean;
  /** Onde, na saída, começou o último texto que está no lugar de uma chave (só em objeto). */
  keyStart: number | null;
}

function escapeControl(char: string): string {
  switch (char) {
    case '\n':
      return '\\n';
    case '\r':
      return '\\r';
    case '\t':
      return '\\t';
    default:
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  }
}

/**
 * Conserta um JSON quase certo: tira comentários e vírgulas sobrando, escapa quebras de linha dentro
 * de textos e fecha o que ficou aberto quando o texto foi cortado no fim.
 */
export function repairJson(source: string): string {
  const frames: Frame[] = [];
  let out = '';
  let inString = false;
  let escaped = false;
  /** Dentro de uma fórmula (`$...$`) de um texto. */
  let inMath = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const top = frames[frames.length - 1];

    if (inString) {
      if (escaped) {
        escaped = false;
        out += char;
      } else if (char === '\\' && inMath && LATEX_COMMAND_START.test(source.slice(index + 1))) {
        // `\frac` com uma barra só: em JSON seria "form feed" + "rac"; vale a barra literal do LaTeX
        out += '\\\\';
      } else if (char === '\\') {
        escaped = true;
        out += char;
      } else if (char === '$') {
        // `R\\$` no JSON é o cifrão escapado (`R\$`) do texto: não abre nem fecha fórmula
        inMath = out.endsWith('\\\\') ? inMath : !inMath;
        out += char;
      } else if (char === '"') {
        inString = false;
        inMath = false;
        out += char;
      } else if (char < ' ') {
        out += escapeControl(char);
      } else {
        out += char;
      }

      continue;
    }

    if (char === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);

      index = end === -1 ? source.length : end;
      continue;
    }

    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);

      index = end === -1 ? source.length : end + 1;
      continue;
    }

    if (char === '"') {
      if (top?.open === '{' && !top.afterColon) {
        top.keyStart = out.length;
      }

      inString = true;
      out += char;
    } else if (char === '{' || char === '[') {
      frames.push({ open: char, afterColon: false, keyStart: null });
      out += char;
    } else if (char === '}' || char === ']') {
      // vírgula sobrando antes de fechar: `[1, 2, ]`
      out = out.replace(/,\s*$/, '');
      frames.pop();
      out += char;
    } else if (char === ':') {
      if (top) {
        top.afterColon = true;
      }

      out += char;
    } else if (char === ',') {
      if (top) {
        top.afterColon = false;
        top.keyStart = null;
      }

      out += char;
    } else {
      out += char;
    }
  }

  return closeOpenParts(out, frames, inString);
}

/** Fecha o que o corte do texto deixou aberto: texto, chave solta, vírgula e colchetes. */
function closeOpenParts(text: string, frames: Frame[], inString: boolean): string {
  let out = text;

  if (frames.length === 0 && !inString) {
    return out;
  }

  if (inString) {
    // se terminou numa barra solta, ela não escapa nada
    out = out.replace(/(?<!\\)(\\\\)*\\$/, '$1');
    out += '"';
  }

  out = out.trimEnd();

  const top = frames[frames.length - 1];

  if (top?.open === '{') {
    if (!top.afterColon && top.keyStart !== null) {
      // chave sem valor (`{"a": 1, "b"`): sai
      out = out.slice(0, top.keyStart).trimEnd();
    } else if (top.afterColon && out.endsWith(':')) {
      out += 'null';
    }
  }

  out = out.replace(/,$/, '');

  for (let index = frames.length - 1; index >= 0; index -= 1) {
    out += frames[index].open === '{' ? '}' : ']';
  }

  return out;
}

/** Sempre repara antes de ler: um JSON válido não muda, e `\frac` válido mas errado (form feed) é pego. */
function tryParse(candidate: string): unknown {
  return JSON.parse(repairJson(candidate));
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Acha e lê o primeiro objeto JSON da resposta da IA, mesmo dentro de cercas de código, com texto em
 * volta, com defeitos pequenos ou cortado no fim. `null` se não houver nenhum objeto utilizável.
 * Chaves soltas no texto ("{assim}") são ignoradas: vale o primeiro trecho que vira um objeto com
 * pelo menos uma chave.
 */
export function parseJsonObject(answer: string): Record<string, unknown> | null {
  let from = 0;

  for (let attempt = 0; attempt < MAX_START_ATTEMPTS; attempt += 1) {
    const start = answer.indexOf('{', from);

    if (start === -1) {
      return null;
    }

    const end = closingIndex(answer, start);
    const candidate = end === -1 ? answer.slice(start) : answer.slice(start, end + 1);

    try {
      const parsed = tryParse(candidate);

      if (isPlainObject(parsed) && Object.keys(parsed).length > 0) {
        return parsed;
      }
    } catch {
      // não é o objeto da resposta: tenta o próximo `{`
    }

    from = start + 1;
  }

  return null;
}

/** Onde fecha o objeto que abre em `start` (`-1` se o texto acaba antes de fechar). */
function closingIndex(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}
