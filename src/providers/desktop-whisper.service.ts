import type { WhisperService } from '../back/modules/ai/whisper/whisper.service';

import type { WhisperBinaryResolver, WhisperLocation } from './whisper-binary-resolver';

export const WhisperServiceMessages = {
  audioMissing: (file: string) => `Arquivo de áudio não encontrado: ${file}`,
  transcribeFailed: 'Falha ao transcrever o áudio.',
} as const;

/** Executa um programa com argumentos (o `execFile` promisificado no app). */
export type WhisperRunner = (file: string, args: string[]) => Promise<unknown>;

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

  async transcribe(audioPath: string): Promise<string> {
    const config = this.deps.config();
    const executable = this.deps.resolver.resolveExecutable(config);
    const model = this.deps.resolver.resolveModel(config);

    if (!this.deps.files.exists(audioPath)) {
      throw new Error(WhisperServiceMessages.audioMissing(audioPath));
    }

    const outputPath = `${audioPath}.txt`;

    try {
      await this.deps.run(executable, [
        '-m',
        model,
        '-f',
        audioPath,
        '-l',
        'pt',
        '--no-prints',
        '--output-txt',
        '-of',
        outputPath.replace(/\.txt$/, ''),
      ]);

      return (await this.deps.files.readText(outputPath)).trim();
    } catch (error) {
      throw new Error(WhisperServiceMessages.transcribeFailed, { cause: error });
    } finally {
      await this.deps.files.remove(outputPath).catch(() => undefined);
    }
  }
}
