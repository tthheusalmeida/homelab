/** Intervalo entre dois envios de texto à tela: o modelo escreve dezenas de pedaços por segundo. */
export const CHUNK_INTERVAL_MS = 50;

/**
 * Junta os pedaços de texto que chegam rápido e os entrega a `emit` no máximo uma vez por intervalo,
 * sempre na ordem. `flush` entrega o que sobrou (no fim da resposta); `stop` descarta o que sobrou.
 */
export class ChunkBatcher {
  private buffer = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly emit: (text: string) => void,
    private readonly intervalMs = CHUNK_INTERVAL_MS,
  ) {}

  push(text: string): void {
    this.buffer += text;
    this.timer ??= setTimeout(() => this.flush(), this.intervalMs);
  }

  flush(): void {
    this.clear();

    if (this.buffer !== '') {
      const text = this.buffer;

      this.buffer = '';
      this.emit(text);
    }
  }

  stop(): void {
    this.clear();
    this.buffer = '';
  }

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
