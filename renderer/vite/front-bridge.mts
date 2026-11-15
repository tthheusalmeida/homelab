import { createRequire } from 'node:module';
import * as path from 'node:path';

type ResolveContext = {
  resolve(source: string, importer?: string, options?: object): Promise<{ id: string } | null>;
};

const posix = (value: string) => value.split(path.sep).join('/');

/** Chave de comparação de caminhos (sem query, absoluta e sem diferença de maiúsculas no Windows). */
const keyOf = (file: string) => path.resolve(file.split('?')[0]).toLowerCase();

/**
 * Ponte entre o renderer do desktop e o front, **sem editar o front**:
 * - carrega os plugins do Vite a partir de `front/node_modules`;
 * - aliases `#ui`, `#components`, `#lib`, `#hooks` e `@front` apontando para `front/src`;
 * - resolve pacotes (`react`, `lucide-react`…) dos arquivos do desktop a partir do front,
 *   garantindo **uma única cópia** de cada um (duas cópias do React quebram os hooks);
 * - troca módulos do front por versões do desktop (`overrides`).
 */
export function createFrontBridge(desktopRoot: string) {
  const frontDir = process.env.HOMELAB_FRONT_DIR
    ? path.resolve(process.env.HOMELAB_FRONT_DIR)
    : path.resolve(desktopRoot, '..', 'front');
  const frontSrc = path.join(frontDir, 'src');
  const rendererDir = path.join(desktopRoot, 'renderer');
  const requireFromFront = createRequire(path.join(frontDir, 'package.json'));

  /** Plugin do Vite instalado no front (módulos ESM chegam com `default`). */
  const loadPlugin = <T,>(name: string): T => {
    const loaded = requireFromFront(name) as { default?: T };

    return (loaded.default ?? loaded) as T;
  };

  const aliases = [
    { find: /^#components\/(.*)$/, replacement: `${posix(frontSrc)}/components/$1.tsx` },
    { find: /^#ui\/(.*)$/, replacement: `${posix(frontSrc)}/ui/$1.tsx` },
    { find: /^#lib\/(.*)$/, replacement: `${posix(frontSrc)}/lib/$1.ts` },
    { find: /^#hooks\/(.*)$/, replacement: `${posix(frontSrc)}/hooks/$1.ts` },
    { find: /^@front\/(.*)$/, replacement: `${posix(frontSrc)}/$1` },
  ];

  /**
   * React resolvido do front para raízes sem `node_modules`. O pré-empacotador de dependências
   * do Vite resolve por conta própria, sem passar pelos plugins.
   */
  const reactAliases = ['react', 'react-dom'].flatMap((name) => {
    const target = posix(path.join(frontDir, 'node_modules', name));

    return [
      { find: new RegExp(`^${name}$`), replacement: target },
      { find: new RegExp(`^${name}/(.*)$`), replacement: `${target}/$1` },
    ];
  });

  /**
   * `noImporter`: também resolve, a partir do front, pedidos sem importador. O Vite faz esses
   * pedidos ao pré-empacotar dependências (o `optimizeDeps.include` do plugin do React); na janela
   * de Configurações a raiz não tem `node_modules` e, sem isso, ele avisa que não acha o React.
   */
  const resolveFromFront = ({ noImporter = false }: { noImporter?: boolean } = {}) => ({
    name: 'desktop-resolve-from-front',
    enforce: 'pre' as const,
    async resolveId(
      this: ResolveContext,
      source: string,
      importer: string | undefined,
      options: object,
    ) {
      const isBare = !/^([./\\#\0]|[a-zA-Z]:)/.test(source) && !source.startsWith('virtual:');
      const fromRenderer = importer ? keyOf(importer).startsWith(keyOf(rendererDir)) : noImporter;

      if (!isBare || !fromRenderer) {
        return null;
      }

      return this.resolve(source, path.join(frontDir, 'index.html'), {
        ...options,
        skipSelf: true,
      });
    },
  });

  /** `{ 'src/components/AppSidebar.tsx': 'renderer/overrides/AppSidebar.tsx' }` (relativo ao front e ao desktop). */
  const overrides = (map: Record<string, string>) => {
    const byFile = new Map(
      Object.entries(map).map(([front, desktop]) => [
        keyOf(path.join(frontDir, front)),
        posix(path.join(desktopRoot, desktop)),
      ]),
    );

    return {
      name: 'desktop-overrides',
      enforce: 'pre' as const,
      async resolveId(
        this: ResolveContext,
        source: string,
        importer: string | undefined,
        options: object,
      ) {
        const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

        return resolved ? (byFile.get(keyOf(resolved.id)) ?? null) : null;
      },
    };
  };

  return {
    desktopRoot,
    frontDir,
    frontSrc,
    rendererDir,
    loadPlugin,
    aliases,
    reactAliases,
    resolveFromFront,
    overrides,
    posix,
  };
}
