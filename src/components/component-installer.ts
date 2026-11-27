import type { ComponentSpec } from './component-manifest';

/** O que um instalador recebe para avisar o andamento e poder ser cancelado. */
export interface InstallContext {
  signal: AbortSignal;
  /** Bytes recebidos até agora e o total (0 = usar o tamanho do catálogo). */
  progress: (receivedBytes: number, totalBytes: number) => void;
}

/**
 * Quem sabe instalar, detectar e remover um tipo de componente que **não** é um arquivo com
 * checksum (ex.: os modelos do assistente local, que o próprio assistente baixa). O
 * `ComponentsService` consulta os instaladores antes do caminho comum de download: tipo novo entra
 * por aqui, sem `if` por nome no serviço.
 */
export interface ComponentInstaller {
  handles(spec: ComponentSpec): boolean;
  isInstalled(spec: ComponentSpec): boolean;
  install(spec: ComponentSpec, context: InstallContext): Promise<void>;
  remove(spec: ComponentSpec): Promise<void>;
}
