export type NavigationDecision = 'allow' | 'external' | 'block';

/**
 * Navegação dentro das origens do app é permitida; http/https de fora abre no
 * navegador do sistema; qualquer outra coisa (file:, javascript:, etc.) é bloqueada.
 */
export function classifyNavigation(url: string, allowedOrigins: string[]): NavigationDecision {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return 'block';
  }

  // `URL.origin` vale "null" para esquemas não padrão do Node (como `app:`).
  const origin = `${parsed.protocol}//${parsed.host}`;

  if (allowedOrigins.includes(origin)) {
    return 'allow';
  }

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    return 'external';
  }

  return 'block';
}
