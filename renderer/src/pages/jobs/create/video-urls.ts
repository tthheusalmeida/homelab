import { isHttpUrl } from '#shared/media-url';

/** Quantos links cabem num único pedido em lote. */
export const MAX_BATCH_LINKS = 50;

/** Quantos links a lista mostra de cara; o resto fica atrás de "Ver todos". */
export const VISIBLE_LINKS = 5;

/**
 * Lê o que foi digitado ou colado: links separados por quebra de linha ou espaço, sem vazios e sem
 * repetidos, mantendo a ordem.
 */
export function parseVideoUrls(text: string): string[] {
  const links = text
    .split(/\s+/)
    .map((link) => link.trim())
    .filter((link) => link !== '');

  return [...new Set(links)];
}

/** Link que o app aceita baixar: só http e https. */
export function isVideoUrl(link: string): boolean {
  return isHttpUrl(link);
}

/** Endereço dividido para a lista: o site em destaque e o resto do caminho mais discreto. */
export function describeLink(link: string): { host: string; path: string } {
  try {
    const url = new URL(link);
    const path = `${url.pathname === '/' ? '' : url.pathname}${url.search}`;

    return { host: url.host.replace(/^www\./, ''), path };
  } catch {
    return { host: link, path: '' };
  }
}
