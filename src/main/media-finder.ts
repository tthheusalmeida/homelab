import { BrowserWindow, type Session } from 'electron';

import type { MediaScan } from '../back/modules/video/platform-downloader';
import { PAGE_SCAN_SCRIPT, toMediaScan, type FrameScan } from '../platform/page-media';
import { isHttpUrl, isLoginPageUrl } from '../shared/media-url';

export interface FindMediaOptions {
  /** Quanto esperar o player aparecer (páginas de curso montam o vídeo depois de carregar). */
  timeoutMs?: number;
  intervalMs?: number;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Abre a página numa janela invisível, com os logins do app, e procura o endereço do vídeo nas tags
 * `video`/`source` de todos os quadros (inclusive iframes de outros domínios, como o player do Canvas).
 * A janela é isolada (sem Node, sem preload, sandbox), muda e só navega por http/https.
 */
export async function findMediaInPage(
  url: string,
  session: Session,
  { timeoutMs = 20000, intervalMs = 1000 }: FindMediaOptions = {},
): Promise<MediaScan> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      session,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  const { webContents } = window;

  webContents.setAudioMuted(true);
  webContents.on('will-navigate', (event, target) => {
    if (!isHttpUrl(target)) {
      event.preventDefault();
    }
  });
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  let frames: FrameScan[] = [];

  try {
    await window.loadURL(url).catch(() => undefined);

    const deadline = Date.now() + timeoutMs;

    do {
      frames = await scanFrames(window);

      if (frames.some((frame) => frame.videos.length > 0) || isLoginPageUrl(webContents.getURL())) {
        break;
      }

      await delay(intervalMs);
    } while (Date.now() < deadline);

    return toMediaScan(frames, webContents.getURL());
  } finally {
    window.destroy();
  }
}

async function scanFrames(window: BrowserWindow): Promise<FrameScan[]> {
  const results = await Promise.all(
    window.webContents.mainFrame.framesInSubtree.map(async (frame) => {
      try {
        return (await frame.executeJavaScript(PAGE_SCAN_SCRIPT)) as FrameScan;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((result): result is FrameScan => result !== null);
}
