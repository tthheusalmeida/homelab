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

  undo: "Desfazer",
  restored: (count: number) =>
    count === 0
      ? "Nada para restaurar"
      : count === 1
        ? "1 processo restaurado"
        : `${count} processos restaurados`,

  cancel: "Cancelar",
  cancelling: "Cancelando…",
  cancelled: "Tarefa cancelada",
  cancelRequested: "Cancelando a tarefa: a etapa em andamento está sendo interrompida",
  notActive: "A tarefa já tinha terminado",
  retry: "Tentar de novo",
  resume: (done: number, total: number) =>
    `${done} de ${total} ${total === 1 ? "parte" : "partes"} já ${done === 1 ? "está salva" : "estão salvas"} em disco: “Tentar de novo” continua daqui.`,
  changeModel: {
    button: "Trocar modelo",
    hint: "Continua de onde parou com outro modelo, sem refazer o que já ficou pronto.",
    title: "Continuar com outro modelo",
    description: (done: number, total: number) =>
      `${done} de ${total} partes já estão prontas e não serão refeitas. Escolha o modelo que vai resumir as que faltam.`,
    descriptionSteps:
      "As etapas já concluídas (download, áudio e transcrição) não serão refeitas. Escolha o modelo que vai resumir.",
    confirm: "Continuar",
  },
  leftovers: {
    button: "Limpar arquivos temporários",
    title: "Limpar arquivos de processos não terminados",
    description: (files: number, size: string) =>
      `${files === 1 ? "1 arquivo" : `${files} arquivos`} (${size}) deixados por processos que falharam, foram cancelados ou foram interrompidos serão apagados. Processos em andamento e os documentos gerados não são afetados. Processos que pararam no meio não poderão mais ser continuados de onde pararam: será preciso refazer as etapas (resumos de PDF exigem escolher o arquivo de novo).`,
    confirm: "Apagar",
    nothing: "Não há arquivos de processos não terminados para limpar.",
    cleaned: (files: number, size: string, failed: number) =>
      `${files === 1 ? "1 arquivo apagado" : `${files} arquivos apagados`} (${size} liberados)${failed > 0 ? `; ${failed === 1 ? "1 item" : `${failed} itens`} em uso não pôde ser apagado` : ""}`,
  },
  retried: (label: string) => `Retomando de onde parou: ${label}`,
  signIn: "Entrar no site",
  signInHint:
    "Uma janela do site vai abrir. Entre com a sua conta e feche a janela: o app tenta de novo sozinho.",
  accessGranted: (label: string) => `Acesso liberado. Tentando de novo: ${label}`,
  accessNotGranted:
    "Não encontramos um login nesse site. Entre na sua conta na janela e feche-a para continuar.",
  step: (current: number, total: number, label: string) =>
    `etapa ${current}/${total} · ${label}`,
  queued: "na fila",
  pipeline: "pipeline",
  pipelineCount: (done: number, total: number) =>
    `${done}/${total} ${total === 1 ? "etapa" : "etapas"}`,
  stepProgress: (label: string) => `Em andamento: ${label}`,
  stepPart: (done: number, total: number) => `parte ${done} de ${total}`,
  stepPercent: (done: number) => `${done}% de 100%`,
  phases: { queue: "Na fila", process: "Processando", done: "Concluído" },
  stepStates: {
    pending: "aguardando",
    running: "em andamento",
    completed: "concluído",
    failed: "falhou",
  } as Record<string, string>,
  facts: { started: "Início", finished: "Fim", duration: "Duração" },
} as const;
