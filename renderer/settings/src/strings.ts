import { RestartStrings } from '#lib/restart';

/** Textos repetidos da janela de Configurações (interface em português). */
export const Strings = {
  title: 'Configurações',
  subtitle: 'Biblioteca, aparência e serviços usados pelo HomeLab',
  loading: 'Carregando',
  loadError: 'Não foi possível carregar as configurações',
  save: 'Salvar',
  saving: 'Salvando',
  saved: 'Salvo',
  test: 'Testar',
  testing: 'Testando',
  pickFolder: 'Escolher pasta',
  groups: {
    external: 'Serviços na nuvem',
    externalHint: 'Inteligências artificiais acessadas pela internet, com a sua chave.',
    localTools: 'Transcrição e áudio',
    localToolsHint: 'Instalados pelo app. Aqui só dá para testar se estão funcionando.',
    localOllama: 'Ollama',
    localOllamaHint: 'Modelos de linguagem no seu computador. O endereço pode ser alterado.',
  },
  appearance: {
    group: 'Tema',
    groupHint:
      'Sistema acompanha o tema do Windows. A cor de destaque vale para botões, links, foco e progresso.',
    theme: 'Tema',
    themeHint: 'Sistema acompanha o tema do Windows.',
    accent: 'Cor de destaque',
    accentHint: 'Botões, links, item ativo do menu, foco, progresso e o carregamento.',
    restore: 'Restaurar padrão',
    reading: {
      title: 'Leitura',
      hint: 'Como o texto aparece nas páginas e nos livros, inclusive no modo leitura.',
      font: 'Fonte',
      size: 'Tamanho',
      fontSize: 'Letra',
      zoom: 'Zoom',
      background: 'Cor de fundo',
      separator: 'Cor dos separadores',
      text: 'Cor do texto',
      sidePanel: 'Painel lateral',
      sidePanelOption: 'Sempre visível na leitura',
      sidePanelHint:
        'Desmarcado, o acompanhamento (sumário, linha do tempo) e as opções só aparecem ao passar o mouse na margem de cada lado, e o texto fica sozinho no centro.',
      sides: 'Acompanhamento e opções',
      swapOption: 'Acompanhamento à direita e opções à esquerda',
      sidesHint:
        'O acompanhamento (sumário, linha do tempo) fica à esquerda do texto e as opções (letra, zoom, "Sobre a página", progresso do livro) à direita. Marcado, os dois trocam de lado em páginas, transcrições, resumos e livros.',
      restore: 'Restaurar leitura',
    },
    transcript: {
      title: 'Transcrição',
      hint: 'Ajustes só das transcrições com tempo. Fonte, tamanho, zoom e cores seguem a Leitura.',
      preview: 'Começo dos trechos',
      previewOption: 'Mostrar o começo dos trechos',
      previewHint:
        'Mostra o começo de cada trecho ao lado do horário, na barra lateral. Desmarcado, fica só o horário.',
      progress: 'Progresso do trecho',
      progressOption: 'Mostrar a barra de progresso de cada trecho',
      progressHint:
        'Ao lado do horário, mostra onde o trecho começa e termina na linha do tempo do áudio.',
      restore: 'Restaurar transcrição',
    },
    summary: {
      title: 'Resumo',
      hint: 'Ajustes só dos resumos. Fonte, tamanho, zoom e cores seguem a Leitura.',
      outline: 'Sumário',
      outlineOption: 'Mostrar o sumário ao lado do texto',
      outlineHint:
        'Lista os títulos do resumo ao lado do texto (o lado segue o ajuste da Leitura), com o trecho em leitura em destaque.',
      restore: 'Restaurar resumo',
    },
  },
  library: {
    groupTitle: 'Pasta de documentos',
    groupHint: 'Páginas e livros ficam aqui. Todo o resto tem lugar fixo.',
    inspecting: 'Verificando a pasta',
    dialogTitle: 'Trocar a pasta da biblioteca',
    moveOption: 'Mover a biblioteca atual para cá',
    moveHint: 'Copia as páginas e os livros para a nova pasta e confere tudo antes de trocar.',
    emptyOption: 'Começar com a biblioteca vazia',
    emptyHint: 'A pasta nova fica vazia; a biblioteca atual continua onde está.',
    deleteOrigin: 'Apagar a pasta antiga depois de mover',
    useExisting: (count: number) =>
      `Esta pasta já tem ${count} arquivo(s). O HomeLab passa a usá-la como está; a biblioteca atual continua onde está.`,
    confirmMove: 'Mover e usar',
    confirmUse: 'Usar esta pasta',
    progressPreparing: 'Preparando a cópia',
    progressRunning: (processed: number, total: number) =>
      `Copiando ${processed} de ${total} arquivos`,
    progressVerifying: 'Conferindo a cópia',
    progressLabel: 'Progresso da cópia',
    moved: 'Biblioteca trocada',
    originKept: (reason: string) => `A pasta antiga não foi apagada: ${reason}`,
    cancel: 'Cancelar',
  },
  restart: RestartStrings,
  prompts: {
    tabs: 'Qual prompt',
    note: 'Você muda só as instruções da IA. Os limites, o formato da resposta e as regras de segurança são do app e continuam valendo, então um texto seu não quebra a geração.',
    inUse: 'Em uso',
    inUseHint: 'A versão que a IA usa nas próximas gerações. Vale na hora, sem reiniciar.',
    placeholder: 'Escolha',
    defaultName: 'Padrão do app',
    defaultHint: 'O texto original do app. Não dá para editar, mas serve de base para uma versão sua.',
    versions: 'Suas versões',
    versionsHint: 'Guarde jeitos diferentes de pedir (por exemplo, um para revisão e outro para prova) e troque quando quiser.',
    empty: 'Você ainda não criou nenhuma versão. A IA usa o padrão do app.',
    badge: 'Em uso',
    newVersion: 'Nova versão',
    view: 'Ver',
    use: 'Usar',
    edit: 'Editar',
    more: 'Mais ações',
    duplicate: 'Duplicar',
    remove: 'Excluir',
    createTitle: 'Nova versão',
    editTitle: 'Editar versão',
    viewTitle: 'Padrão do app',
    createHint: 'Começa com o texto do padrão. Mude o que quiser; o limite de tamanho aparece embaixo.',
    viewHint: 'Só para ler. Crie uma versão a partir dele para poder mudar.',
    name: 'Nome',
    namePlaceholder: 'Ex.: Revisão para prova',
    text: 'Instruções',
    activateOnSave: 'Usar esta versão depois de salvar',
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    createFromDefault: 'Criar versão a partir do padrão',
    counter: 'Caracteres usados',
    tooShort: (min: number) => `Escreva pelo menos ${min} caracteres.`,
    tooLong: (max: number) => `O texto passou de ${max} caracteres.`,
    discardTitle: 'Descartar as mudanças?',
    discardText: 'O que você escreveu e ainda não salvou será perdido.',
    discard: 'Descartar',
    keepEditing: 'Continuar editando',
    deleteTitle: (name: string) => `Excluir "${name}"?`,
    deleteText: 'A versão deixa de existir. Se ela estava em uso, a IA volta a usar o padrão do app.',
    deleteConfirm: 'Excluir',
    saved: 'Versão salva.',
    activated: (name: string) => `Em uso: ${name}.`,
    deleted: 'Versão excluída.',
    saveFailed: 'Não foi possível salvar o prompt.',
    loadFailed: 'Não foi possível carregar os prompts.',
    retry: 'Tentar de novo',
    copySuffix: ' (cópia)',
    examples: 'Exemplos prontos',
    examplesHint:
      'Cada exemplo abre o editor com o texto padrão inteiro mais um ajuste no final (em "# AJUSTES"). Mude o que quiser antes de salvar.',
    useAsBase: 'Usar como base',
    guide: 'Como escrever',
    guideHint:
      'Escreva frases curtas dizendo como a IA deve trabalhar, no mesmo estilo do texto padrão.',
    canAdd: 'Você pode acrescentar',
    careful: 'Tenha cuidado com',
  },
  infographic: {
    tabs: 'Galeria do infográfico',
    tabLayouts: 'Modelos',
    tabPieces: 'Peças',
    layoutsHint:
      'Um infográfico de exemplo com os dez modelos que a IA pode usar, um em cada seção, com a cor de destaque e o tema do app.',
    layoutsIndex: 'Ir para um modelo',
    piecesHint:
      'As peças do banco, por tema, com a chave que a IA usa e as palavras-chave que ajudam a escolher a peça certa para cada texto.',
  },
} as const;

export type SectionId =
  | 'paths'
  | 'appearance'
  | 'infographic'
  | 'external'
  | 'local'
  | 'prompts'
  | 'components'
  | 'access'
  | 'backup'
  | 'updates';

/** Chave de `useCollapsedGroups` das Configurações (separada da barra do app). */
export const SETTINGS_COLLAPSED_KEY = 'homelab.settings-collapsed';

export interface SectionInfo {
  id: SectionId;
  label: string;
  description: string;
}

/** Grupos do menu das Configurações, na mesma ordem e com o mesmo comportamento da barra do app. */
export const SECTION_GROUPS: ReadonlyArray<{ label: string; ids: readonly SectionId[] }> = [
  { label: 'Geral', ids: ['appearance', 'paths', 'infographic'] },
  { label: 'IA', ids: ['external', 'local', 'prompts'] },
  { label: 'Sistema', ids: ['components', 'access', 'backup', 'updates'] },
];

export const SECTIONS: ReadonlyArray<SectionInfo> = [
  {
    id: 'paths',
    label: 'Biblioteca',
    description:
      'Onde ficam as suas páginas e livros. Todo o resto (entrada, temporários e dados do app) tem lugar fixo.',
  },
  {
    id: 'appearance',
    label: 'Aparência',
    description:
      'Tema, cor de destaque e como o texto aparece na leitura. Vale na hora, sem reiniciar.',
  },
  {
    id: 'infographic',
    label: 'Infográfico',
    description:
      'Galeria dos modelos e das peças que a IA usa para montar o infográfico de um resumo.',
  },
  {
    id: 'external',
    label: 'IAs externas',
    description: 'Serviços de inteligência artificial na nuvem, como o Gemini.',
  },
  {
    id: 'local',
    label: 'Serviços locais',
    description:
      'Programas que rodam no seu computador: transcrição, processamento de áudio e Ollama.',
  },
  {
    id: 'prompts',
    label: 'Prompts',
    description:
      'Mude o jeito de a IA montar o mapa mental e outras gerações. Guarde versões com nome e escolha qual usar; o padrão do app fica sempre à mão.',
  },
  {
    id: 'components',
    label: 'Componentes',
    description:
      'O que o app precisa para transcrever e baixar vídeos: transcrição, processamento de áudio, aceleração por placa de vídeo e modelos. Baixe outros modelos quando quiser.',
  },
  {
    id: 'access',
    label: 'Acessos',
    description:
      'Logins que o HomeLab guarda, cifrados, para baixar vídeos de sites que exigem conta. Você entra uma vez; aqui dá para esquecê-los.',
  },
  {
    id: 'backup',
    label: 'Backup',
    description: 'Salve ou restaure páginas, livros, chats e histórico em um único arquivo .zip.',
  },
  {
    id: 'updates',
    label: 'Sobre',
    description:
      'Versão instalada, novidades e atualização do HomeLab (baixa só o que mudou, sem perder nada), e como apoiar o projeto.',
  },
];

export const PATH_FIELDS = [
  {
    key: 'libraryDir',
    label: 'Biblioteca',
    hint: 'Páginas e livros. Ao trocar de pasta, você escolhe se os documentos atuais vão junto.',
  },
] as const;

/** Rótulos dos campos de configuração dos providers locais. */
export const LOCAL_FIELD_LABELS: Record<string, string> = {
  url: 'Endereço (URL)',
};

/** Passo a passo de cada serviço externo; aparece até a chave ser salva. Novo serviço = nova entrada aqui. */
export const EXTERNAL_PROVIDER_GUIDES: Record<
  string,
  {
    title: string;
    steps: ReadonlyArray<{ text: string; link?: { href: string; label: string } }>;
    note?: string;
  }
> = {
  gemini: {
    title: 'Como criar a chave do Gemini',
    steps: [
      {
        text: 'Abra o Google AI Studio e entre com a sua conta Google.',
        link: { href: 'https://aistudio.google.com/apikey', label: 'Abrir o AI Studio' },
      },
      { text: 'Clique em "Criar chave de API" (Create API key).' },
      {
        text: 'Escolha um projeto do Google Cloud ou deixe o AI Studio criar um novo, e confirme.',
      },
      { text: 'Copie a chave gerada (ela começa com "AIza").' },
      { text: 'Cole a chave no campo "Chave da API" abaixo e clique em "Testar" para conferir.' },
      { text: 'Clique em "Salvar" e reinicie o HomeLab para a chave passar a valer.' },
    ],
    note: 'O uso gratuito tem limites por minuto e por dia. Para ir além, ative o faturamento no Google Cloud. Quem tem a chave usa a sua cota: não compartilhe.',
  },
};

export const EXTERNAL_PROVIDER_HINTS: Record<string, string> = {
  gemini: 'Modelos de IA do Google, na nuvem.',
};

export const LOCAL_PROVIDER_HINTS: Record<string, string> = {
  whisper: 'Transcreve os áudios localmente.',
  ollama: 'Modelos de linguagem locais.',
  ffmpeg: 'Converte vídeo em áudio antes de transcrever.',
};
