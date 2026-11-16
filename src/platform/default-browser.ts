export type RegistryQuery = (args: string[]) => Promise<string>;

const HTTPS_CHOICE_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice';

/** Início do ProgId que o Windows guarda para o navegador padrão → nome que o yt-dlp entende. */
const BROWSERS: ReadonlyArray<readonly [prefix: string, name: string]> = [
  ['ChromeHTML', 'chrome'],
  ['MSEdgeHTM', 'edge'],
  ['FirefoxURL', 'firefox'],
  ['BraveHTML', 'brave'],
  ['OperaStable', 'opera'],
  ['VivaldiHTM', 'vivaldi'],
];

export function browserFromProgId(progId: string): string | null {
  return BROWSERS.find(([prefix]) => progId.startsWith(prefix))?.[1] ?? null;
}

/**
 * Navegador padrão do usuário, para o yt-dlp ler os logins que ele já fez lá. Só no Windows (lê o
 * registro); em outro sistema ou se algo falhar devolve `null` e o usuário entra pelo app.
 */
export async function detectDefaultBrowser(
  platform: NodeJS.Platform,
  query: RegistryQuery,
): Promise<string | null> {
  if (platform !== 'win32') {
    return null;
  }

  try {
    const output = await query(['query', HTTPS_CHOICE_KEY, '/v', 'ProgId']);
    const progId = /ProgId\s+REG_SZ\s+(\S+)/.exec(output)?.[1];

    return progId ? browserFromProgId(progId) : null;
  } catch {
    return null;
  }
}
