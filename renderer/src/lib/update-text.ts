import { settingsUrl } from '#lib/settings-route';

/** Seção das Configurações com a atualização do app. */
export const UPDATES_SECTION = 'updates';

export const UPDATES_URL = settingsUrl(UPDATES_SECTION);

/** Textos da atualização do app (barra lateral e Configurações). */
export const UpdateStrings = {
  sidebarTitle: (version: string) => `Atualização ${version} disponível`,
  sidebarDownloading: (percent: number) => `Baixando a atualização · ${percent}%`,
  sidebarReady: (version: string) => `Atualização ${version} pronta`,
  sidebarInstalling: 'Instalando a atualização',
  sidebarHint: 'Toque para ver as novidades e atualizar.',
  sidebarReadyHint: 'Já baixada: só falta reiniciar.',
  sidebarOpen: 'Abrir atualização do app',
  progressLabel: 'Progresso do download',
  currentVersion: 'Versão instalada',
  lastCheck: 'Última verificação',
  neverChecked: 'Ainda não verificou nesta sessão',
  upToDate: 'Você está na versão mais recente.',
  available: (version: string) => `A versão ${version} está disponível.`,
  ready: (version: string) =>
    `A versão ${version} já foi baixada e será instalada ao reiniciar ou ao fechar o app.`,
  checking: 'Verificando…',
  check: 'Verificar agora',
  download: 'Baixar atualização',
  restart: 'Reiniciar e atualizar',
  openPage: 'Ver a versão no navegador',
  downloading: (percent: number) => `Baixando a atualização… ${percent}%`,
  installing: 'Instalando… o HomeLab vai fechar e abrir de novo sozinho.',
  keepData: 'Biblioteca, conversas, configurações e componentes instalados são mantidos.',
  noAutoInstall: 'Neste sistema a atualização é instalada por você: abra a página da versão.',
  notesTitle: (version: string) => `Novidades da versão ${version}`,
  noNotes: 'Esta versão não traz notas.',
  confirmTitle: 'Reiniciar o HomeLab?',
  confirmDescription:
    'O app vai fechar para instalar a versão nova e abrir de novo. Tarefas em andamento serão interrompidas.',
  confirm: 'Reiniciar agora',
  autoCheck: 'Verificar atualizações automaticamente',
  autoCheckHint: 'Ao abrir o app e a cada 6 horas. "Verificar agora" funciona sempre.',
  requestFailed: 'Não foi possível concluir. Tente de novo.',
} as const;
