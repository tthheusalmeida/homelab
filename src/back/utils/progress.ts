/** Andamento de uma etapa, de 0 a 100. */
export type PercentListener = (percent: number) => void;

const clamp = (value: number): number => Math.min(100, Math.max(0, Math.floor(value)));

/** Último valor que casa com o padrão no texto (o programa escreve vários, o último é o atual). */
function lastMatch(text: string, pattern: RegExp): RegExpMatchArray | null {
  const all = [...text.matchAll(new RegExp(pattern.source, 'g'))];

  return all.length > 0 ? all[all.length - 1] : null;
}

/** Whisper (`--print-progress`): `progress =  10%`. */
export function parseWhisperPercent(text: string): number | null {
  const match = lastMatch(text, /progress\s*=\s*(\d{1,3})\s*%/);

  return match ? clamp(Number(match[1])) : null;
}

/** yt-dlp (`--progress-template`): `HLPROG 42.3%`. */
export function parseYtDlpPercent(text: string): number | null {
  const match = lastMatch(text, /HLPROG\s+(\d{1,3}(?:\.\d+)?)%/);

  return match ? clamp(Number(match[1])) : null;
}

const toSeconds = (hours: string, minutes: string, seconds: string): number =>
  Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

/** ffmpeg: duração total (`Duration: 00:10:00.00`) escrita no começo da saída. */
export function parseFfmpegDuration(text: string): number | null {
  const match = text.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);

  return match ? toSeconds(match[1], match[2], match[3]) : null;
}

/** ffmpeg: ponto atual (`time=00:01:23.45`). */
export function parseFfmpegTime(text: string): number | null {
  const match = lastMatch(text, /time=(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);

  return match ? toSeconds(match[1], match[2], match[3]) : null;
}

/**
 * Acompanha a saída do ffmpeg e avisa a porcentagem convertida. Só funciona depois de ler a
 * duração total, que o ffmpeg escreve antes de começar.
 */
export function ffmpegPercentTracker(onPercent: PercentListener): (text: string) => void {
  let duration: number | null = null;

  return (text) => {
    duration ??= parseFfmpegDuration(text);

    const time = parseFfmpegTime(text);

    if (duration && duration > 0 && time !== null) {
      onPercent(clamp((time / duration) * 100));
    }
  };
}

/** Repassa só quando a porcentagem muda: a tela não precisa de 100 avisos iguais. */
export function onlyChanges(listener: PercentListener): PercentListener {
  let last = -1;

  return (percent) => {
    if (percent !== last) {
      last = percent;
      listener(percent);
    }
  };
}
