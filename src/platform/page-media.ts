import type { MediaScan } from '../back/modules/video/platform-downloader';
import { isHttpUrl, isLoginPageUrl } from '../shared/media-url';

/** O que o script de busca devolve de cada quadro (página principal ou iframe). */
export interface FrameScan {
  videos: string[];
  iframes: string[];
}

/**
 * Roda dentro de cada quadro da página: endereços das tags `video`/`source` (o `currentSrc` é o que
 * o player escolheu) e dos iframes. Os endereços já saem absolutos.
 */
export const PAGE_SCAN_SCRIPT = `(() => {
  const videos = [];
  document.querySelectorAll('video').forEach((video) => {
    if (video.currentSrc) videos.push(video.currentSrc);
    else if (video.src) videos.push(video.src);
    video.querySelectorAll('source[src]').forEach((source) => videos.push(source.src));
  });
  const iframes = Array.from(document.querySelectorAll('iframe[src]')).map((frame) => frame.src);
  return { videos, iframes };
})()`;

function unique(urls: string[]): string[] {
  return [...new Set(urls)].filter((url) => isHttpUrl(url));
}

/**
 * Candidatos a baixar, em ordem: vídeos achados nas tags (blob: e data: são ignorados, o yt-dlp não
 * os alcança) e, só se não houver nenhum, os iframes (podem ser YouTube, Vimeo etc.).
 */
export function collectMediaUrls(frames: FrameScan[]): string[] {
  const videos = unique(frames.flatMap((frame) => frame.videos));

  return videos.length > 0 ? videos : unique(frames.flatMap((frame) => frame.iframes));
}

export function toMediaScan(frames: FrameScan[], finalUrl: string): MediaScan {
  const urls = collectMediaUrls(frames);

  return { urls, loginRequired: urls.length === 0 && isLoginPageUrl(finalUrl) };
}
