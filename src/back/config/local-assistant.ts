/**
 * O assistente local gerenciado pelo app (a IA que roda no computador do usuário, instalada como
 * componente). O back só enxerga esta porta: se está instalado, onde atende e como ligá-lo.
 * Quem a implementa é o `OllamaRuntime` (ver `providers/ollama-runtime.ts`).
 */
export interface LocalAssistant {
  /** Endereço em que ele atende (porta privada, só deste computador). */
  readonly baseUrl: string;
  /** O programa foi instalado pelo app? */
  isInstalled(): boolean;
  /** Liga o assistente se estiver desligado e espera ele responder. Chamadas juntas dividem a mesma partida. */
  ensureRunning(): Promise<void>;
}
