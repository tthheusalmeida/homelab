import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Trava a regra de identidade: tooltip é o `Tip` e lista de opções é o `OptionSelect`/`SuggestInput`.
 * Nada de `title` do navegador (não segue o tema), `<select>` ou `<datalist>` nativos nas telas.
 */
const ROOTS = [__dirname, join(__dirname, '..', 'settings', 'src')];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      return sources(path);
    }

    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

const files = ROOTS.flatMap(sources).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

/** Abertura de elemento do DOM (ou de controle que repassa a prop ao DOM) com `title=`. */
const NATIVE_TITLE =
  /<(?:button|span|div|a|li|p|input|img|svg|label|td|th|Button|Badge|Link|ExternalLink|HexSwatch)\b(?:[^>]|=>)*?\stitle=/;

describe('native browser controls', () => {
  it('when scanning the screens, should not find <select> or <datalist>', () => {
    const found = files.filter(({ text }) => /<(select|datalist)\b/.test(text)).map(({ path }) => path);

    expect(found).toEqual([]);
  });

  it('when scanning the screens, should not find a title attribute on a DOM element or control', () => {
    const found = files.filter(({ text }) => NATIVE_TITLE.test(text)).map(({ path }) => path);

    expect(found).toEqual([]);
  });
});
