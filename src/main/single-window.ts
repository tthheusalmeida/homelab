export interface ManagedWindow {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  restore(): void;
  focus(): void;
}

/**
 * Garante uma única janela de um tipo (ex.: Configurações): se já existe, só a
 * traz para a frente; se foi fechada, cria de novo.
 */
export class SingleWindowController<W extends ManagedWindow> {
  private window: W | null = null;

  constructor(private readonly create: () => W) {}

  open(): W {
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMinimized()) {
        this.window.restore();
      }

      this.window.focus();

      return this.window;
    }

    this.window = this.create();

    return this.window;
  }
}
