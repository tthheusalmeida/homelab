/** Textos repetidos da janela de Configurações (interface em português). */
export const Strings = {
  title: 'Configurações',
  subtitle: 'Pastas e serviços usados pelo HomeLab',
  loading: 'Carregando',
  loadError: 'Não foi possível carregar as configurações',
  save: 'Salvar',
  saving: 'Salvando',
  saved: 'Salvo',
  test: 'Testar',
  testing: 'Testando',
  pickFolder: 'Escolher pasta',
  restart: {
    message: 'As alterações só valem depois de reiniciar o HomeLab.',
    action: 'Reiniciar agora',
  },
} as const;

export type SectionId = 'paths' | 'external' | 'local';

export const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  description: string;
}> = [
  {
    id: 'paths',
    label: 'Pastas',
    description: 'Onde ficam a biblioteca, a entrada e os arquivos temporários.',
  },
  {
    id: 'external',
    label: 'IAs externas',
    description: 'Serviços de inteligência artificial na nuvem, como o Gemini.',
  },
  {
    id: 'local',
    label: 'Serviços locais',
    description: 'Programas que rodam no seu computador: Whisper, Ollama e ffmpeg.',
  },
];

export const PATH_FIELDS = [
  {
    key: 'libraryDir',
    label: 'Biblioteca',
    hint: 'Documentos publicados e arquivados.',
  },
  {
    key: 'inboxDir',
    label: 'Entrada',
    hint: 'Conteúdos gerados aguardando decisão.',
  },
  {
    key: 'videoTempDir',
    label: 'Vídeos temporários',
    hint: 'Vídeos baixados durante os jobs.',
  },
  {
    key: 'audioTempDir',
    label: 'Áudios temporários',
    hint: 'Áudios convertidos para a transcrição.',
  },
] as const;

/** Rótulos dos campos de configuração dos providers locais. */
export const LOCAL_FIELD_LABELS: Record<string, string> = {
  directory: 'Pasta',
  executable: 'Executável',
  model: 'Arquivo de modelo',
  url: 'Endereço (URL)',
};

/** Campos que aceitam o seletor de pasta do sistema. */
export const PICKABLE_LOCAL_FIELDS: ReadonlySet<string> = new Set(['directory']);

export const EXTERNAL_PROVIDER_HINTS: Record<string, string> = {
  gemini: 'Modelos de IA do Google, na nuvem.',
};

export const LOCAL_PROVIDER_HINTS: Record<string, string> = {
  whisper: 'Transcreve os áudios localmente.',
  ollama: 'Modelos de linguagem locais.',
  ffmpeg: 'Converte vídeo em áudio, usando o ffmpeg instalado no sistema.',
};
