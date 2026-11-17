export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

const VERSION_FORMAT = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** Lê uma versão SemVer (aceita o prefixo `v` das tags); texto fora do padrão devolve `null`. */
export function parseVersion(text: string): ParsedVersion | null {
  const match = VERSION_FORMAT.exec(text.trim());

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function comparePrerelease(first: string[], second: string[]): number {
  // Sem pré-lançamento vale mais que com (1.0.0 > 1.0.0-beta).
  if (first.length === 0 || second.length === 0) {
    return second.length - first.length;
  }

  for (let index = 0; index < Math.max(first.length, second.length); index += 1) {
    const [left, right] = [first[index], second[index]];

    if (left === undefined || right === undefined) {
      return left === undefined ? -1 : 1;
    }

    const bothNumbers = /^\d+$/.test(left) && /^\d+$/.test(right);
    const difference = bothNumbers ? Number(left) - Number(right) : left.localeCompare(right);

    if (difference !== 0) {
      return difference < 0 ? -1 : 1;
    }
  }

  return 0;
}

/** Negativo se `first` é mais antiga, positivo se é mais nova, 0 se iguais (ordem do SemVer). */
export function compareVersions(first: ParsedVersion, second: ParsedVersion): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (first[key] !== second[key]) {
      return first[key] < second[key] ? -1 : 1;
    }
  }

  return comparePrerelease(first.prerelease, second.prerelease);
}

/** A versão `candidate` é mais nova que `current`? Texto inválido em qualquer lado conta como não. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const next = parseVersion(candidate);
  const installed = parseVersion(current);

  return next !== null && installed !== null && compareVersions(next, installed) > 0;
}
