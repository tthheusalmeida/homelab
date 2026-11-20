import type { BookCoverColor } from "./types";

/**
 * Degradê da capa de cada cor. São as 15 cores do tema (as mesmas do seletor de Configurações >
 * Aparência, ver `accentOptions`) mais `slate`, que só existe em livros antigos e não é oferecida.
 * As classes ficam escritas por inteiro para o Tailwind encontrá-las.
 */
const coverGradients: Record<BookCoverColor, string> = {
  pink: "from-pink-600 to-pink-900",
  rose: "from-rose-600 to-rose-900",
  red: "from-red-600 to-red-900",
  orange: "from-orange-600 to-orange-900",
  amber: "from-amber-500 to-amber-800",
  yellow: "from-yellow-500 to-yellow-800",
  lime: "from-lime-500 to-lime-800",
  green: "from-green-600 to-green-900",
  emerald: "from-emerald-600 to-emerald-900",
  teal: "from-teal-600 to-teal-900",
  cyan: "from-cyan-600 to-cyan-900",
  sky: "from-sky-600 to-sky-900",
  blue: "from-blue-600 to-blue-900",
  indigo: "from-indigo-600 to-indigo-900",
  violet: "from-violet-600 to-violet-900",
  slate: "from-slate-600 to-slate-900",
};

export const DEFAULT_COVER_COLOR: BookCoverColor = "blue";

export function gradientOf(color: BookCoverColor | undefined): string {
  return coverGradients[color ?? DEFAULT_COVER_COLOR] ?? coverGradients[DEFAULT_COVER_COLOR];
}

/** Texto vazio é válido (sem imagem); senão precisa ser uma URL http(s). */
export function isValidCoverImageUrl(value: string): boolean {
  const url = value.trim();

  if (url === "") {
    return true;
  }

  try {
    const { protocol } = new URL(url);

    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
