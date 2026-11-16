/** Executa um programa e devolve a saída; falha se ele não existir. */
export type RunForOutput = (file: string, args: string[]) => Promise<string>;

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

/** Arquivos `.desktop` do navegador padrão no Linux → nome que o yt-dlp entende. */
const DESKTOP_BROWSERS: ReadonlyArray<readonly [prefix: string, name: string]> = [
  ['google-chrome', 'chrome'],
  ['chromium', 'chromium'],
  ['microsoft-edge', 'edge'],
  ['firefox', 'firefox'],
  ['brave', 'brave'],
  ['opera', 'opera'],
  ['vivaldi', 'vivaldi'],
];

export function browserFromDesktopFile(desktopFile: string): string | null {
  const name = desktopFile.trim().toLowerCase();

  return DESKTOP_BROWSERS.find(([prefix]) => name.startsWith(prefix))?.[1] ?? null;
}

export function browserFromProgId(progId: string): string | null {
  return BROWSERS.find(([prefix]) => progId.startsWith(prefix))?.[1] ?? null;
}

/**
 * Navegador padrão do usuário, para o yt-dlp ler os logins que ele já fez lá. No Windows lê o
 * registro; no Linux pergunta ao `xdg-settings`. Em outro sistema ou se algo falhar devolve `null`
 * e o usuário entra pelo app.
 */
export async function detectDefaultBrowser(
  platform: NodeJS.Platform,
  run: RunForOutput,
): Promise<string | null> {
  try {
    if (platform === 'win32') {
      const output = await run('reg', ['query', HTTPS_CHOICE_KEY, '/v', 'ProgId']);
      const progId = /ProgId\s+REG_SZ\s+(\S+)/.exec(output)?.[1];

      return progId ? browserFromProgId(progId) : null;
    }

    if (platform === 'linux') {
      return browserFromDesktopFile(await run('xdg-settings', ['get', 'default-web-browser']));
    }

    return null;
  } catch {
    return null;
  }
}
