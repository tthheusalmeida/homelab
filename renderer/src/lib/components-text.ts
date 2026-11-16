import type {
  ComponentGroup,
  ComponentInfo,
  ComponentState,
  ComponentsOverall,
} from '#shared/contracts/components';

import { formatBytes } from './format';

export const ComponentStrings = {
  groups: {
    runtime: 'Obrigatórios',
    download: 'Download de vídeos',
    gpu: 'Aceleração por placa de vídeo',
    model: 'Modelos de transcrição',
  } satisfies Record<ComponentGroup, string>,
  groupHints: {
    runtime: 'Já vêm com o app e são necessários para ele funcionar.',
    download:
      'Recomendado. Permite colar links do YouTube e de outras plataformas, não só do arquivo do vídeo.',
    gpu: 'Opcional. Deixa a transcrição bem mais rápida em placas NVIDIA.',
    model: 'Escolha o que baixar agora. Os outros podem ser baixados depois, nas Configurações.',
  } satisfies Record<ComponentGroup, string>,
  states: {
    missing: 'Não instalado',
    queued: 'Na fila',
    downloading: 'Baixando',
    verifying: 'Conferindo o arquivo',
    installing: 'Instalando',
    installed: 'Instalado',
    failed: 'Falhou',
  } satisfies Record<ComponentState, string>,
  recommended: 'Recomendado',
  required: 'Obrigatório',
  active: 'Em uso',
  bundledNote: 'Já incluído no app',
  use: 'Usar',
  remove: 'Remover',
  install: 'Instalar selecionados',
  cancel: 'Cancelar',
  retry: 'Tentar de novo',
  hardwareTitle: 'Seu computador',
  hardwareUnknown: 'Placa de vídeo não identificada',
  ram: (gb: number) => `${gb} GB de memória`,
  vram: (gb: number) => `${gb} GB de vídeo`,
  gpuKind: { dedicated: 'dedicada', integrated: 'integrada' },
  nothingToInstall: 'Tudo o que você marcou já está instalado.',
  totalSize: (bytes: number) => `Total a baixar: ${formatBytes(bytes)}`,
  overall: (done: number, total: number) => `Instalando ${done} de ${total}`,
  sidebarPending: 'Concluir a instalação',
  sidebarPendingHint: 'Falta baixar um modelo para transcrever.',
  sidebarOpen: 'Ver detalhes da instalação',
  removed: (label: string) => `${label} removido.`,
  activated: (label: string) => `${label} agora está em uso.`,
  installFailed: 'Não foi possível instalar.',
  assistant: {
    title: 'Vamos preparar o HomeLab',
    description:
      'Para transcrever as aulas no seu computador, o app precisa de alguns componentes. Veja o que vai ser instalado e escolha os modelos.',
    runningTitle: 'Instalando o que o HomeLab precisa',
    runningDescription: 'Pode deixar o app aberto. Você acompanha cada item abaixo.',
    doneTitle: 'Tudo pronto',
    doneDescription: 'O HomeLab já pode transcrever as suas aulas.',
    later: 'Agora não',
    done: 'Concluir',
    start: 'Instalar',
    details: 'Ver detalhes nas Configurações',
  },
} as const;

export const progressPercent = (received: number, total: number): number =>
  total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;

/** "320 MB de 1,5 GB (21%)" para o item que está baixando. */
export function progressText(component: ComponentInfo): string {
  if (!component.progress) {
    return ComponentStrings.states[component.state];
  }

  const { receivedBytes, totalBytes } = component.progress;

  return `${formatBytes(receivedBytes)} de ${formatBytes(totalBytes)} (${progressPercent(receivedBytes, totalBytes)}%)`;
}

export function overallPercent(overall: ComponentsOverall): number {
  return progressPercent(overall.receivedBytes, overall.totalBytes);
}

/**
 * O que a instalação deve baixar: o que o usuário marcou **mais** os obrigatórios que ainda faltam
 * (num sistema onde o obrigatório não vem no instalador, como o Linux, ele também é baixado). O que
 * já vem no app (`bundled`) e o que já está instalado ficam de fora.
 */
export function idsToInstall(
  components: ComponentInfo[],
  selected: ReadonlySet<string>,
): ComponentInfo[] {
  return components.filter(
    (component) =>
      !component.bundled &&
      component.state !== 'installed' &&
      (component.required || selected.has(component.id)),
  );
}

/** Soma o que ainda falta baixar entre os componentes marcados e os obrigatórios que faltam. */
export function pendingBytes(components: ComponentInfo[], selected: ReadonlySet<string>): number {
  return idsToInstall(components, selected).reduce(
    (sum, component) => sum + component.sizeBytes,
    0,
  );
}
