/**
 * Porta da transcrição de áudio. O back original executava o Whisper aqui; no desktop quem
 * transcreve é o `DesktopWhisperService` (`providers/`), com o executável vindo do resolvedor por
 * plataforma e o modelo do Settings. Os processors dependem só deste contrato.
 */
export abstract class WhisperService {
  abstract transcribe(audioPath: string): Promise<string>;
}
