/** Textos da tela de chat (interface em português). */
export const ChatStrings = {
  newChat: "Novo chat",
  referencesOpen: (count: number) =>
    count === 0 ? "Referências desta conversa (nenhuma ainda)" : `Referências desta conversa: ${count}`,
  referencesTitle: "Referências desta conversa",
  referencesDescription:
    "As páginas em que cada resposta deste chat se apoiou. O número é o da marca [n] no texto daquela resposta.",
  referencesOfAnswer: (question: string) =>
    question ? `Resposta a: ${question}` : "Resposta",
  hideList: "Esconder conversas",
  showList: "Mostrar conversas",
  listTitle: "conversas",
  listLabel: "Conversas",
  emptyList: "Nenhuma conversa ainda. Envie uma mensagem para começar.",
  loadListError: "Não foi possível carregar as conversas.",
  retry: "Tentar de novo",
  messages: (count: number) => (count === 1 ? "1 mensagem" : `${count} mensagens`),
  deleteChat: (title: string) => `Excluir a conversa ${title}`,
  busy: "Aguarde a resposta ou cancele antes de trocar de conversa.",

  deleteTitle: "Excluir conversa",
  deleteDescription: (title: string) =>
    `A conversa "${title}" será excluída e não poderá ser recuperada.`,
  deleteConfirm: "Excluir",

  cancelled: "Geração cancelada",
  sendFailed: "Não foi possível enviar a mensagem.",
  loadChatFailed: "Não foi possível abrir esta conversa.",

  contextHint: (tokens: string) => `${tokens} no contexto (estimativa)`,

  warningTitle: "Esta conversa está grande",
  warningDescription: (tokens: string, percent: number | null) =>
    percent === null
      ? `São ${tokens} de contexto (estimativa). Cada envio reenvia a conversa inteira e consome muitos tokens.`
      : `São ${tokens} de contexto (estimativa), cerca de ${percent}% do limite do modelo. Cada envio reenvia a conversa inteira e consome muitos tokens.`,
  warningNewChat: "Começar um chat novo",
  warningSend: "Enviar mesmo assim",
  warningCancel: "Cancelar",
} as const;
