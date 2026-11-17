/**
 * Se alguma configuração salva só vale depois de reiniciar. Vive no main (e não na janela de
 * Configurações) para o aviso sobreviver ao fechamento dela e aparecer na barra lateral do app.
 * Zera sozinho ao reiniciar, pois o processo recomeça.
 */
export class RestartState {
  private pending = false;

  constructor(private readonly onChange: (pending: boolean) => void) {}

  isPending(): boolean {
    return this.pending;
  }

  /** Marca o reinício como pendente e avisa uma única vez (marcar de novo não repete o aviso). */
  mark(): void {
    if (this.pending) {
      return;
    }

    this.pending = true;
    this.onChange(true);
  }
}
