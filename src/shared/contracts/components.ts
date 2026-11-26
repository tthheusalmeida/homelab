/**
 * Componentes que o app precisa para funcionar (Whisper, ffmpeg, aceleração por GPU, modelos).
 * O assistente de instalação e Configurações > Componentes mostram esta lista.
 */
export type ComponentGroup = 'runtime' | 'download' | 'gpu' | 'model' | 'ocr';

export type ComponentState =
  'missing' | 'queued' | 'downloading' | 'verifying' | 'installing' | 'installed' | 'failed';

export interface ComponentProgress {
  receivedBytes: number;
  totalBytes: number;
}

export interface ComponentInfo {
  id: string;
  group: ComponentGroup;
  label: string;
  description: string;
  /** Pré-requisito: marcado e sem opção de desmarcar. */
  required: boolean;
  /** Já vem dentro do instalador (não é baixado). */
  bundled: boolean;
  sizeBytes: number;
  state: ComponentState;
  progress: ComponentProgress | null;
  error: string | null;
  /** Escolha pré-selecionada pelo app a partir do hardware. */
  recommended: boolean;
  /** Modelo em uso pelo Whisper (só para `group: 'model'`). */
  active: boolean;
}

export type GpuKind = 'dedicated' | 'integrated';

export interface GpuInfo {
  name: string;
  vendor: 'nvidia' | 'amd' | 'intel' | 'other';
  kind: GpuKind;
  /** Memória de vídeo em MB; `null` quando não foi possível medir. */
  vramMb: number | null;
}

export type Accelerator = 'cuda' | 'cpu';

export interface HardwareRecommendation {
  accelerator: Accelerator;
  /** Componentes (ids) que o app marca por padrão. */
  componentIds: string[];
  /** Modelo recomendado para virar o ativo. */
  modelId: string;
  /** Explicação em português, mostrada ao usuário. */
  message: string;
}

export interface HardwareProfile {
  gpus: GpuInfo[];
  ramMb: number;
  recommendation: HardwareRecommendation;
}

export interface ComponentsOverall {
  /** Componentes na fila desta instalação (concluídos inclusive). */
  total: number;
  done: number;
  receivedBytes: number;
  totalBytes: number;
}

export interface ComponentsStatus {
  components: ComponentInfo[];
  hardware: HardwareProfile;
  running: boolean;
  /** `null` quando não há instalação em andamento. */
  overall: ComponentsOverall | null;
  /** Falta algum componente obrigatório ou nenhum modelo está instalado: o app não transcreve. */
  needsSetup: boolean;
}

export interface ComponentsInstallRequest {
  ids: string[];
}

export interface ComponentRequest {
  id: string;
}
