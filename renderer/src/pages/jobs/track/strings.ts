/** Textos da tela de acompanhamento de jobs (interface em português). */
export const TrackStrings = {
  select: "Selecionar",
  cancelSelection: "Cancelar seleção",
  selectAll: "Selecionar todos",
  clearSelection: "Limpar seleção",
  deleteSelected: (count: number) => `Excluir selecionados (${count})`,
  deleteAll: "Excluir todos",
  activeCannotBeDeleted: "Em andamento: só pode ser excluído quando terminar.",
  nothingToDelete: "Não há processos concluídos ou com falha para excluir.",
  selectJob: (label: string, id: string) => `Selecionar ${label} (${id})`,

  confirmSelectedTitle: "Excluir processos selecionados",
  confirmSelected: (count: number) =>
    `${count === 1 ? "1 processo será excluído" : `${count} processos serão excluídos`} do histórico. Os documentos gerados continuam na biblioteca.`,
  confirmAllTitle: "Excluir todo o histórico",
  confirmAll: (count: number, active: number) =>
    `${count === 1 ? "1 processo concluído ou com falha será excluído" : `${count} processos concluídos ou com falha serão excluídos`} do histórico. Os documentos gerados continuam na biblioteca.${active > 0 ? ` ${active === 1 ? "1 processo em andamento permanece" : `${active} processos em andamento permanecem`} na lista.` : ""}`,
  confirmLabel: "Excluir",

  deleted: (count: number) =>
    count === 1 ? "1 processo excluído" : `${count} processos excluídos`,
  keptActive: (count: number) =>
    count === 1
      ? "1 em andamento não foi excluído"
      : `${count} em andamento não foram excluídos`,
  nothingDeleted: "Nenhum processo foi excluído",
} as const;
