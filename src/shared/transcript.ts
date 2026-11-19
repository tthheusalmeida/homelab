/**
 * Formato da transcrição com tempo, compartilhado pelo back (que grava) e pela tela (que lê).
 * Cada trecho é um bloco do Markdown que começa com o instante da fala: `[HH:MM:SS] texto`,
 * separado do próximo por uma linha em branco.
 */

/** Casa o início de um trecho com tempo: `[HH:MM:SS] texto` (horas podem ter 2 ou mais dígitos). */
export const TIMESTAMP_PREFIX = /^\[(\d{2,}):(\d{2}):(\d{2})\]\s+/;

/** "[HH:MM:SS]" a partir de milissegundos (trunca os segundos; negativo vira zero). */
export function formatTimestamp(startMs: number): string {
  const total = Math.floor(Math.max(0, startMs) / 1000);
  const two = (n: number) => String(n).padStart(2, '0');
  return `[${two(Math.floor(total / 3600))}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}]`;
}

export interface TimedExcerpt {
  /** Segundo do vídeo em que o trecho começa. */
  seconds: number;
  text: string;
}

/**
 * Lê o corpo de uma transcrição com tempo. Devolve `null` quando o texto não segue o formato
 * (documentos antigos ou editados à mão): basta que um bloco não comece com o tempo. Assim a tela
 * mostra esses documentos como texto corrido, sem perder nada.
 */
export function parseTimedTranscript(content: string): TimedExcerpt[] | null {
  const blocks = content
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  const excerpts: TimedExcerpt[] = [];

  for (const block of blocks) {
    const match = TIMESTAMP_PREFIX.exec(block);

    if (!match) {
      return null;
    }

    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    const text = block.slice(match[0].length).replace(/\s+/g, ' ').trim();

    if (!text) {
      return null;
    }

    excerpts.push({ seconds, text });
  }

  return excerpts;
}

/** "H:MM:SS" ou "M:SS" para mostrar em tela (sem zeros à esquerda nas horas). */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');

  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const MEDIA_FILE = /\.(mp4|m4v|webm|mov|mkv|ogv|mp3|m4a|wav|ogg|opus)$/i;

/**
 * Endereço do vídeo no instante do trecho. YouTube (`t=`), Vimeo (`#t=`) e links diretos de
 * arquivo (fragmento `#t=`) abrem no momento certo. Qualquer outra plataforma, ou um endereço que
 * não seja http(s), devolve o link como está (só abre o vídeo) ou `null` se não for um link.
 */
export function buildVideoLink(sourceUrl: string, seconds: number): string | null {
  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  const second = Math.max(0, Math.floor(seconds));

  if (YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    url.searchParams.delete('start');
    url.searchParams.set('t', `${second}s`);
    return url.toString();
  }

  if (VIMEO_HOSTS.has(url.hostname.toLowerCase())) {
    url.hash = `t=${second}s`;
    return url.toString();
  }

  if (MEDIA_FILE.test(url.pathname)) {
    url.hash = `t=${second}`;
    return url.toString();
  }

  return url.toString();
}

/** `true` quando o link abre no instante certo (e não só no vídeo). */
export function supportsTimedLink(sourceUrl: string): boolean {
  const base = buildVideoLink(sourceUrl, 0);
  const moved = buildVideoLink(sourceUrl, 1);

  return base !== null && moved !== null && base !== moved;
}
