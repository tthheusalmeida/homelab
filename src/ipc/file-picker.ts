export interface FileFilter {
  name: string;
  /** Extensões sem ponto (ex.: `zip`). */
  extensions: string[];
}

/** Seletores de arquivo do sistema (salvar e abrir). Devolvem `null` quando o usuário cancela. */
export interface FilePicker {
  pickSavePath(options: { defaultPath?: string; filters: FileFilter[] }): Promise<string | null>;
  pickOpenPath(options: { filters: FileFilter[] }): Promise<string | null>;
}

/** O que o `dialog` do Electron oferece (já com a janela pai resolvida por quem implementa). */
export interface FileDialogs {
  showSave(options: {
    defaultPath?: string;
    filters: FileFilter[];
  }): Promise<{ canceled: boolean; filePath?: string }>;
  showOpen(options: { filters: FileFilter[] }): Promise<{ canceled: boolean; filePaths: string[] }>;
}

/** `FilePicker` sobre os diálogos nativos. Nada fora do `main/index.ts` importa o `electron`. */
export class DialogFilePicker implements FilePicker {
  constructor(private readonly dialogs: FileDialogs) {}

  async pickSavePath(options: {
    defaultPath?: string;
    filters: FileFilter[];
  }): Promise<string | null> {
    const result = await this.dialogs.showSave(options);

    return result.canceled ? null : (result.filePath ?? null);
  }

  async pickOpenPath(options: { filters: FileFilter[] }): Promise<string | null> {
    const result = await this.dialogs.showOpen(options);

    return result.canceled ? null : (result.filePaths[0] ?? null);
  }
}
