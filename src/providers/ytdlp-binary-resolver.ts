import * as path from 'node:path';

export interface YtDlpResolverOptions {
  /** Pasta dos binários da plataforma (`resources/bin/<plataforma>-<arch>`). */
  binDir: string;
  platform: NodeJS.Platform;
  exists: (file: string) => boolean;
}

/** Nome do executável do yt-dlp na plataforma. */
export function ytDlpExecutableName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

/** Caminho do yt-dlp instalado (componente baixado) ou `null` se ainda não foi instalado. */
export function resolveYtDlpPath({
  binDir,
  platform,
  exists,
}: YtDlpResolverOptions): string | null {
  const file = path.join(binDir, ytDlpExecutableName(platform));

  return exists(file) ? file : null;
}
