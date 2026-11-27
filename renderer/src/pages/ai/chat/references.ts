import type { ChatReference } from "#shared/contracts/chat";

/** Seção mais específica da referência (sem repetir o título da página), ou `""`. */
export function referenceSection(reference: ChatReference): string {
  return reference.headingPath.filter((name) => name !== reference.title).at(-1) ?? "";
}

/** Nome da referência para tooltip e leitor de tela: `Página › Seção` (ou só a página). */
export function referenceLabel(reference: ChatReference): string {
  const section = referenceSection(reference);

  return section ? `${reference.title} › ${section}` : reference.title;
}

/** Endereço que abre a página na seção usada (`/library/<id>#<âncora>`). */
export function referenceTarget(reference: ChatReference): { pathname: string; hash: string } {
  return {
    pathname: `/library/${reference.documentId}`,
    hash: reference.anchor ? `#${reference.anchor}` : "",
  };
}
