import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Trava a regra de identidade: o único indicador de carregamento do app é o `HexLoader` (os hexágonos
 * que acendem em sequência). Nada de spinner girando (`Loader2`, `Loader`, `animate-spin`).
 */
const ROOTS = [__dirname, join(__dirname, '..', 'settings', 'src')];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      return sources(path);
    }

    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = ROOTS.flatMap(sources).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

describe('single loading indicator', () => {
  it('when scanning the screens, should not find a spinning icon (animate-spin)', () => {
    const found = files.filter(({ text }) => /animate-spin/.test(text)).map(({ path }) => path);

    expect(found).toEqual([]);
  });

  it('when scanning the screens, should not import a spinner icon from lucide', () => {
    const found = files
      .filter(({ text }) => /\bLoader2?\b[^'"\n]*from\s+['"]lucide-react['"]|import\s*\{[^}]*\bLoader2?\b[^}]*\}\s*from\s*['"]lucide-react['"]/.test(text))
      .map(({ path }) => path);

    expect(found).toEqual([]);
  });

  it('when the button shows it is working, should use the hexagon loader', () => {
    const button = files.find(({ path }) => path.endsWith('ui\\button.tsx') || path.endsWith('ui/button.tsx'));

    expect(button?.text).toContain('HexLoader');
  });
});
