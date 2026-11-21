// Gera `renderer/src/fonts.css` só com os alfabetos que o app usa (pt-BR e textos técnicos).
// Os pacotes @fontsource trazem todos os alfabetos (cirílico, vietnamita...), que só pesam no
// instalador: este script copia os `@font-face` dos pacotes mantendo `latin`, `latin-ext`, `greek`,
// `math` e `symbols` (letras gregas e símbolos aparecem em resumos de ciência).
// Rode `npm run fonts` depois de atualizar os pacotes de fonte.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEEP = /-(latin-ext|latin|greek|math|symbols)-(wght|\d+)/;

/** Cada fonte: o pacote e o CSS dele que vale (a variável em um arquivo; a estática, um por peso). */
const SOURCES = [
  ['@fontsource-variable/inter', ['wght.css']],
  ['@fontsource-variable/literata', ['wght.css']],
  ['@fontsource-variable/merriweather', ['wght.css']],
  ['@fontsource-variable/lora', ['wght.css']],
  ['@fontsource/atkinson-hyperlegible', ['400.css', '700.css']],
];

const blocks = [];

for (const [pkg, files] of SOURCES) {
  for (const file of files) {
    const css = readFileSync(path.join(root, 'node_modules', pkg, file), 'utf8');

    for (const match of css.matchAll(/\/\* ([^*]+) \*\/\s*(@font-face \{[^}]*\})/g)) {
      const [, name, face] = match;

      if (!KEEP.test(name)) {
        continue;
      }

      blocks.push(
        `/* ${name} */\n${face
          // só woff2 (o Electron lê); o `.woff` de reserva só pesaria
          .replace(/, url\([^)]*\.woff\) format\('woff'\)/, '')
          .replace(/url\(\.\/files\//g, `url(../../node_modules/${pkg}/files/`)}`,
      );
    }
  }
}

const header =
  '/* GERADO por `npm run fonts` (scripts/build-fonts-css.mjs). Não edite à mão.\n' +
  ' * Só os alfabetos usados: latin, latin-ext, greek, math e symbols. */\n\n';

writeFileSync(path.join(root, 'renderer', 'src', 'fonts.css'), header + blocks.join('\n\n') + '\n');
console.log(`fonts.css: ${blocks.length} @font-face`);
