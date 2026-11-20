/** O que a IA gera sozinha ao abrir a aba do resumo. */
export type GeneratedKind = 'mind-map' | 'infographic';

const keyOf = (kind: GeneratedKind) => `homelab.dismissed.${kind}`;

function read(kind: GeneratedKind): Set<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(keyOf(kind)) ?? '[]');

    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function write(kind: GeneratedKind, ids: Set<string>): void {
  try {
    window.localStorage.setItem(keyOf(kind), JSON.stringify([...ids]));
  } catch {
    // sem armazenamento (modo privado, cota cheia): vale só até fechar o app, como antes
  }
}

/**
 * Páginas em que o usuário **excluiu de propósito** o mapa mental ou o infográfico. Nelas a aba não
 * gera outro sozinha, nem em uma sessão nova: quem decide gerar de novo é o botão. Fica no
 * navegador do app (localStorage), como as demais preferências da tela.
 */
export function isGenerationDismissed(kind: GeneratedKind, documentId: string): boolean {
  return read(kind).has(documentId);
}

/** Registra que o usuário excluiu de propósito: a geração automática deixa essa página em paz. */
export function dismissGeneration(kind: GeneratedKind, documentId: string): void {
  const ids = read(kind);

  if (!ids.has(documentId)) {
    write(kind, ids.add(documentId));
  }
}

/** O usuário pediu para gerar de novo: a geração automática volta a valer para a página. */
export function allowGeneration(kind: GeneratedKind, documentId: string): void {
  const ids = read(kind);

  if (ids.delete(documentId)) {
    write(kind, ids);
  }
}
