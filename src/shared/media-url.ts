/** Extensões de arquivo de mídia que dá para baixar direto, sem passar por uma plataforma. */
const DIRECT_MEDIA_EXTENSIONS = new Set([
  'mp4',
  'm4v',
  'mov',
  'webm',
  'mkv',
  'avi',
  'mp3',
  'm4a',
  'wav',
  'ogg',
  'oga',
  'flac',
  'aac',
  'opus',
]);

/**
 * Link que aponta direto para um arquivo de vídeo ou áudio (`.mp4`, `.mp3`...). Qualquer outro
 * endereço (YouTube, Vimeo, páginas de curso...) é tratado como link de plataforma.
 */
export function isDirectMediaUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const extension = pathname.split('.').pop()?.toLowerCase() ?? '';

    return DIRECT_MEDIA_EXTENSIONS.has(extension);
  } catch {
    return false;
  }
}

/** Endereço http ou https válido (o app não baixa de `file:`, `ftp:` etc.). */
export function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);

    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Palavra inteira (separada por `.`, `/` ou `-`) que costuma marcar uma tela de login. */
const LOGIN_WORD = /(^|[./_-])(login|signin|sign-in|sso|auth|cas|accounts)([./_-]|$)/i;

/**
 * O endereço é uma tela de login (Canvas, Moodle, SSO...)? Olha só o domínio e o caminho, e palavras
 * inteiras: "progresso" não conta como "sso".
 */
export function isLoginPageUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);

    return LOGIN_WORD.test(`${hostname}${pathname}`);
  } catch {
    return false;
  }
}
