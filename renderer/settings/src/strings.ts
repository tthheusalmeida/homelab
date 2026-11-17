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
    theme: 'Tema',
    themeHint: 'Sistema acompanha o tema do Windows.',
    accent: 'Cor de destaque',
    accentHint: 'Botões, links, item ativo do menu, foco, progresso e o carregamento.',
    restore: 'Restaurar padrão',
    reading: {
      title: 'Leitura',
      hint: 'Como o texto aparece nas páginas e nos livros, inclusive no modo leitura.',
      font: 'Fonte',
      fontSize: 'Letra',
      zoom: 'Zoom',
      zoomHint: 'Amplia a letra e a largura do texto juntas, como o zoom de um PDF.',
      background: 'Cor de fundo',
      text: 'Cor do texto',
      sidePanel: 'Painel lateral',
      sidePanelOption: 'Sempre visível no modo leitura',
      sidePanelHint:
        'Desmarcado, o sumário e os ajustes só abrem ao passar o mouse na borda direita, e o texto fica sozinho no centro.',
      restore: 'Restaurar leitura',
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
  restart: {
    message: 'As alterações só valem depois de reiniciar o HomeLab.',
    action: 'Reiniciar agora',
  },
} as const;

export type SectionId =
  | 'paths'
  | 'appearance'
  | 'external'
  | 'local'
  | 'components'
  | 'access'
  | 'backup';

/** Chave de `useCollapsedGroups` das Configurações (separada da barra do app). */
export const SETTINGS_COLLAPSED_KEY = 'homelab.settings-collapsed';

export interface SectionInfo {
  id: SectionId;
  label: string;
  description: string;
}

/** Grupos do menu das Configurações, na mesma ordem e com o mesmo comportamento da barra do app. */
export const SECTION_GROUPS: ReadonlyArray<{ label: string; ids: readonly SectionId[] }> = [
  { label: 'Geral', ids: ['appearance', 'paths'] },
  { label: 'IA', ids: ['external', 'local'] },
  { label: 'Sistema', ids: ['components', 'access', 'backup'] },
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
    description: 'Tema claro ou escuro e a cor de destaque do app. Vale na hora, sem reiniciar.',
  },
  {
    id: 'external',
    label: 'IAs externas',
    description: 'Serviços de inteligência artificial na nuvem, como o Gemini.',
  },
  {
    id: 'local',
    label: 'Serviços locais',
    description: 'Programas que rodam no seu computador: transcrição, processamento de áudio e Ollama.',
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
  { title: string; steps: ReadonlyArray<{ text: string; link?: { href: string; label: string } }>; note?: string }
> = {
  gemini: {
    title: 'Como criar a chave do Gemini',
    steps: [
      {
        text: 'Abra o Google AI Studio e entre com a sua conta Google.',
        link: { href: 'https://aistudio.google.com/apikey', label: 'Abrir o AI Studio' },
      },
      { text: 'Clique em "Criar chave de API" (Create API key).' },
      { text: 'Escolha um projeto do Google Cloud ou deixe o AI Studio criar um novo, e confirme.' },
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
