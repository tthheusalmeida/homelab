/** Trecho falado com o instante (em milissegundos) em que começa e termina no áudio. */
export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Porta da transcrição de áudio. O back original executava o Whisper aqui; no desktop quem
 * transcreve é o `DesktopWhisperService` (`providers/`), com o executável vindo do resolvedor por
 * plataforma e o modelo do Settings. Os processors dependem só deste contrato.
 */
export abstract class WhisperService {
  /** Só o texto (usado pelo resumo). */
  abstract transcribe(
    audioPath: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<string>;

  /** Texto com o tempo de cada trecho (usado pela transcrição com marcas de tempo). */
  abstract transcribeSegments(
    audioPath: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<TranscriptSegment[]>;
}
