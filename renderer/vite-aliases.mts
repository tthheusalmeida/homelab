import * as path from 'node:path';

/** Aliases do renderer (espelham `paths` do `tsconfig.renderer.json`). */
export function rendererAliases(desktopRoot: string) {
  const src = path.join(desktopRoot, 'renderer', 'src').split(path.sep).join('/');
  const shared = path.join(desktopRoot, 'src', 'shared').split(path.sep).join('/');

  return [
    { find: /^#components\/(.*)$/, replacement: `${src}/components/$1.tsx` },
    { find: /^#ui\/(.*)$/, replacement: `${src}/ui/$1.tsx` },
    { find: /^#lib\/(.*)$/, replacement: `${src}/lib/$1.ts` },
    { find: /^#hooks\/(.*)$/, replacement: `${src}/hooks/$1.ts` },
    { find: /^#test\/(.*)$/, replacement: `${src}/test/$1` },
    { find: /^#shared\/(.*)$/, replacement: `${shared}/$1` },
  ];
}
