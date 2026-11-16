import * as path from 'node:path';

/** Nome do ffmpeg usado quando não há um embutido: o sistema o procura no PATH. */
export const FFMPEG_FROM_PATH = 'ffmpeg';

export interface FfmpegResolverOptions {
  /** Pasta dos binários da plataforma (`resources/bin/<plataforma>-<arch>`). */
  binDir: string;
  platform: NodeJS.Platform;
  exists: (file: string) => boolean;
}

/** Nome do executável do ffmpeg na plataforma. */
export function ffmpegExecutableName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

/**
 * Caminho do ffmpeg: o embutido na pasta de binários, quando existe; senão `ffmpeg`, que o
 * sistema resolve pelo PATH (desenvolvimento e plataformas sem binário embutido).
 */
export function resolveFfmpegPath({ binDir, platform, exists }: FfmpegResolverOptions): string {
  const bundled = path.join(binDir, ffmpegExecutableName(platform));

  return exists(bundled) ? bundled : FFMPEG_FROM_PATH;
}
