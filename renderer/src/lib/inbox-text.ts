/**
 * Nome da tela onde as páginas geradas pelas tarefas esperam para ser classificadas (título,
 * categoria e tags) antes de entrar na biblioteca. É só o texto: a rota segue `/library/inbox`.
 * Para trocar o nome, troque aqui.
 */
export const InboxStrings = {
  name: 'Classificação',
  /** Contador do menu (leitor de tela): "3 para classificar". */
  badge: (count: number) => `${count} para classificar`,
  /** Botão da biblioteca vazia. */
  goTo: 'Ir para a Classificação',
  /** "…pela Classificação" (readicionar uma página removida). */
  via: 'pela Classificação',
  /** "…da Classificação". */
  from: 'da Classificação',
  /** "…na Classificação". */
  inside: 'na Classificação',
} as const;
