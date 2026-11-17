/**
 * Porta do atualizador nativo (`electron-updater`): baixa só os blocos que mudaram do instalador e
 * o aplica. A implementação com o Electron está em `main/electron-native-updater.ts`; o
 * `AppUpdater` só conhece esta interface (e por isso é testado sem Electron).
 */
export interface NativeUpdater {
  /**
   * Aponta o atualizador para o Release dessa versão e confere o `latest.yml` dele. Devolve `false`
   * quando o Release não traz o que precisa para atualizar (sem `latest.yml`, ou sem versão nova).
   */
  prepare(version: string): Promise<boolean>;
  /** Baixa só a diferença (conferida pelo SHA-512 do `latest.yml`). `onProgress` recebe 0 a 100. */
  download(onProgress: (percent: number) => void): Promise<void>;
  /** Fecha o app, instala a versão baixada e abre o app de novo. */
  quitAndInstall(): void;
}
