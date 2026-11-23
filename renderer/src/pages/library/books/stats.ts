import type { BookReading } from "./types";

/** Velocidade de leitura usada na estimativa (palavras por minuto). */
export const WORDS_PER_MINUTE = 200;

export interface BookStats {
  modules: number;
  chapters: number;
  words: number;
  /** Tempo de leitura estimado, em minutos (mínimo 1 se houver texto). */
  minutes: number;
  /** Palavras de cada capítulo, por id de documento. */
  wordsByChapter: Map<string, number>;
}

/** Mesmos espaços do `\s` das expressões regulares (inclui quebras de linha e espaços Unicode). */
function isSpace(code: number): boolean {
  return (
    code === 32 ||
    (code >= 9 && code <= 13) ||
    code === 160 ||
    code === 5760 ||
    (code >= 8192 && code <= 8202) ||
    code === 8232 ||
    code === 8233 ||
    code === 8239 ||
    code === 8287 ||
    code === 12288 ||
    code === 65279
  );
}

/** Conta as palavras sem montar uma lista delas (roda no livro inteiro, então tem de ser leve). */
export function countWords(text: string): number {
  let words = 0;
  let inWord = false;

  for (let index = 0; index < text.length; index += 1) {
    const space = isSpace(text.charCodeAt(index));

    if (!space && !inWord) {
      words += 1;
    }

    inWord = !space;
  }

  return words;
}

/** Minutos de leitura estimados para essa quantidade de palavras (mínimo 1 se houver texto). */
export function minutesToRead(words: number): number {
  return words <= 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Números do livro a partir do texto lido (só capítulos disponíveis). */
export function bookStats(reading: BookReading): BookStats {
  const wordsByChapter = new Map<string, number>();
  let words = 0;
  let chapters = 0;

  for (const module of reading.modules) {
    for (const chapter of module.chapters) {
      const count = countWords(chapter.content);

      wordsByChapter.set(chapter.documentId, count);
      words += count;
      chapters += 1;
    }
  }

  return {
    modules: reading.modules.length,
    chapters,
    words,
    minutes: minutesToRead(words),
    wordsByChapter,
  };
}

/** `1 h 20 min`, `45 min` ou `—` quando não há texto. */
export function formatReadingTime(minutes: number): string {
  if (minutes <= 0) {
    return "—";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
