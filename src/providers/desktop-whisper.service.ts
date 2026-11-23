import type { TranscriptSegment, WhisperService } from '../back/modules/ai/whisper/whisper.service';

import type { WhisperBinaryResolver, WhisperLocation } from './whisper-binary-resolver';
import { onlyChanges, parseWhisperPercent, type PercentListener } from '../back/utils/progress';
import { parseWhisperJson } from './whisper-json';

export const WhisperServiceMessages = {
  audioMissing: (file: string) => `Arquivo de áudio não encontrado: ${file}`,
  transcribeFailed: 'Falha ao transcrever o áudio.',
} as const;

/** Executa um programa com argumentos (o `execFile` promisificado no app). */
export type WhisperRunner = (
  file: string,
  args: string[],
  /** Recebe o texto que o programa escreve enquanto roda (para acompanhar o andamento). */
  onText?: (text: string) => void,
) => Promise<unknown>;

export interface WhisperFiles {
  exists(file: string): boolean;
  readText(file: string): Promise<string>;
  remove(file: string): Promise<void>;
}

export interface DesktopWhisperDeps {
  /** Configuração atual do Whisper (pasta, executável e modelo). */
  config: () => WhisperLocation;
  resolver: WhisperBinaryResolver;
  run: WhisperRunner;
  files: WhisperFiles;
}

/**
 * Substitui o `WhisperService` do back (mesma interface: `transcribe(audioPath)`), com o executável
 * e o modelo vindos do resolvedor e do Settings. Mesmos argumentos do Whisper, mesma limpeza do
 * `.txt` e mesma mensagem de falha; muda só a origem dos caminhos e o código de erro de
 * configuração (`NOT_CONFIGURED`/`UNSUPPORTED_PLATFORM`), que sobe como mensagem clara no job.
 */
export class DesktopWhisperService implements WhisperService {
  constructor(private readonly deps: DesktopWhisperDeps) {}

  async transcribe(audioPath: string, onProgress?: PercentListener): Promise<string> {
    return this.runWhisper(audioPath, '--output-txt', '.txt', (raw) => raw.trim(), onProgress);
  }

  /** Mesma execução, mas pedindo o JSON para obter o tempo de cada trecho. */
  async transcribeSegments(
    audioPath: string,
    onProgress?: PercentListener,
  ): Promise<TranscriptSegment[]> {
    return this.runWhisper(audioPath, '--output-json', '.json', parseWhisperJson, onProgress);
  }

  private async runWhisper<T>(
    audioPath: string,
    outputFlag: '--output-txt' | '--output-json',
    extension: '.txt' | '.json',
    parse: (raw: string) => T,
    onProgress?: PercentListener,
  ): Promise<T> {
    const config = this.deps.config();
    const executable = this.deps.resolver.resolveExecutable(config);
    const model = this.deps.resolver.resolveModel(config);

    if (!this.deps.files.exists(audioPath)) {
      throw new Error(WhisperServiceMessages.audioMissing(audioPath));
    }

    const outputPath = `${audioPath}${extension}`;

    try {
      const notify = onProgress && onlyChanges(onProgress);
      const args = [
        '-m',
        model,
        '-f',
        audioPath,
        '-l',
        'pt',
        '--no-prints',
        // sem quem acompanhe, não pede o andamento
        ...(notify ? ['--print-progress'] : []),
        outputFlag,
        '-of',
        audioPath,
      ];

      if (notify) {
        await this.deps.run(executable, args, (text) => {
          const percent = parseWhisperPercent(text);

          if (percent !== null) {
            notify(percent);
          }
        });
      } else {
        await this.deps.run(executable, args);
      }

      return parse(await this.deps.files.readText(outputPath));
    } catch (error) {
      throw new Error(WhisperServiceMessages.transcribeFailed, { cause: error });
    } finally {
      await this.deps.files.remove(outputPath).catch(() => undefined);
    }
  }
}
