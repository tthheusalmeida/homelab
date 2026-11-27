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

/** Uma página (seção) usada na conversa e em quantas respostas apareceu. */
export interface UsedReference {
  reference: ChatReference;
  answers: number;
}

/**
 * Todas as referências usadas numa conversa, sem repetir (a mesma página e seção em várias respostas
 * vira uma só, com a contagem), na ordem em que apareceram pela primeira vez.
 */
export function usedReferences(
  messages: ReadonlyArray<{ references?: ChatReference[] }>,
): UsedReference[] {
  const used = new Map<string, UsedReference>();

  for (const message of messages) {
    for (const reference of message.references ?? []) {
      const key = `${reference.documentId}#${reference.anchor ?? ""}`;
      const found = used.get(key);

      if (found) {
        found.answers += 1;
      } else {
        used.set(key, { reference, answers: 1 });
      }
    }
  }

  return [...used.values()];
}

/** As referências de uma resposta, com a pergunta a que ela respondeu. */
export interface AnswerReferences {
  id: string;
  /** O que o usuário perguntou (a mensagem logo antes da resposta); vazio se não houver. */
  question: string;
  references: ChatReference[];
}

/**
 * As referências da conversa **agrupadas por resposta**, na ordem do chat. O número de cada uma só
 * faz sentido dentro da própria resposta (o `[1]` de uma não é o `[1]` de outra), então a lista da
 * conversa as mostra assim: quem vê a marca no texto acha, no grupo daquela resposta, qual página é.
 */
export function referencesByAnswer(
  messages: ReadonlyArray<{
    id: string;
    role: string;
    content: string;
    references?: ChatReference[];
  }>,
): AnswerReferences[] {
  return messages.flatMap((message, index) => {
    if (message.role !== "assistant" || !message.references?.length) {
      return [];
    }

    const before = messages[index - 1];

    return [
      {
        id: message.id,
        question: before?.role === "user" ? before.content : "",
        references: message.references,
      },
    ];
  });
}
