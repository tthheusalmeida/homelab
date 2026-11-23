import { Injectable } from '@nestjs/common';

import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { AIProviderName, AIRetryInfo } from '../ai/ai.model';
import { SummaryDetail } from '../ai/prompts/summary-specialist.prompt';
import { splitText } from '../../utils/text';
import { AIService } from '../ai/ai.service';
import { BackConfig } from '../../config/back-config';
import { abortError, execStreaming, isAbortError } from '../../utils/exec-streaming';
import { ffmpegPercentTracker, onlyChanges, type PercentListener } from '../../utils/progress';
import { isDirectMediaUrl, isHttpUrl } from '../../../shared/media-url';
import { PlatformDownloader } from './platform-downloader';

const execFileAsync = promisify(execFile);

export const VideoMessages = {
  invalidUrl: 'Informe um link que comece com http:// ou https://.',
} as const;

export interface VideoSummarizeOptions {
  providerId: AIProviderName;
  modelId: string;
  thinking?: string;
  /** Qualquer valor diferente de brief divide transcrições longas em partes. */
  detail?: SummaryDetail;
  /** Chamado antes de cada nova tentativa automática do provedor de IA. */
  onRetry?: (info: AIRetryInfo) => void;
  /** Cancela a chamada à IA (cancelar o job). */
  signal?: AbortSignal;
}

/** Tamanho máximo (em caracteres) de cada parte enviada ao modelo. */
export const SUMMARY_CHUNK_CHARS = 12000;

@Injectable()
export class VideoService {
  private readonly platform: PlatformDownloader;

  constructor(
    private readonly aiService: AIService,
    private readonly config: BackConfig,
  ) {
    this.platform = new PlatformDownloader({
      tools: config.platformTools,
      // Lido a cada download: o ffmpeg pode ser instalado pelo app com ele já aberto.
      get ffmpegPath() {
        return config.ffmpegPath?.();
      },
      run: (file, args, onText, signal) =>
        onText || signal ? execStreaming(file, args, onText, signal) : execFileAsync(file, args),
    });
  }

  /**
   * Baixa o vídeo. Link direto para um arquivo vai por HTTP; qualquer outro link (YouTube, Vimeo,
   * páginas de curso) vai pelo yt-dlp, que baixa só o áudio e devolve o arquivo que gravou.
   */
  async download(
    url: string,
    fileName: string = 'video-baixado.mp4',
    destinationDir: string = this.config.videoTempDir,
    onProgress?: PercentListener,
    signal?: AbortSignal,
  ): Promise<string> {
    if (!isHttpUrl(url)) {
      throw new Error(VideoMessages.invalidUrl);
    }

    if (this.config.platformTools && !isDirectMediaUrl(url)) {
      fs.mkdirSync(destinationDir, { recursive: true });

      return this.platform.download(
        url,
        path.parse(fileName).name,
        destinationDir,
        onProgress,
        signal,
      );
    }

    return this.downloadFile(url, fileName, destinationDir, onProgress, signal);
  }

  private downloadFile(
    url: string,
    fileName: string,
    destinationDir: string,
    onProgress?: PercentListener,
    signal?: AbortSignal,
  ): Promise<string> {
    // path.resolve lida automaticamente com diferenças de sistema operacional
    const outputPath = path.resolve(destinationDir, fileName);

    // Garante que a pasta de destino existe antes de criar o stream
    fs.mkdirSync(destinationDir, { recursive: true });

    if (signal?.aborted) {
      return Promise.reject(abortError());
    }

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(outputPath);

      // Remove o arquivo parcialmente baixado quando ocorre algum erro.
      // Só apaga depois de fechar: se a conexão falhar antes de o arquivo abrir,
      // apagar antes deixaria um arquivo vazio para trás.
      const cleanup = () => {
        fileStream.close(() => fs.unlink(outputPath, () => {}));
      };

      // Escuta o erro de escrita desde a criação: ele pode ocorrer antes da resposta
      // (pasta removida, sem permissão) e, sem ouvinte, derrubaria o processo.
      fileStream.on('error', (error) => {
        cleanup();

        reject(
          new Error(`Erro ao salvar o vídeo: ${error.message}`, {
            cause: error,
          }),
        );
      });

      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const request = client.get(url, (response) => {
        // O vídeo pode estar hospedado em outro endereço.
        // Neste caso, segue o redirecionamento para continuar o download.
        if (
          response.statusCode !== undefined &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          // Libera o response atual porque ele não contém o vídeo.
          response.resume();

          this.downloadFile(
            new URL(response.headers.location, url).href,
            fileName,
            destinationDir,
            onProgress,
            signal,
          )
            .then(resolve)
            .catch(reject);

          return;
        }

        if (response.statusCode !== 200) {
          cleanup();

          reject(new Error(`Falha ao baixar. Status Code: ${response.statusCode}`));

          return;
        }

        // Com o tamanho total no cabeçalho, acompanha quanto já chegou.
        const total = Number(response.headers['content-length']);

        if (onProgress && total > 0) {
          const notify = onlyChanges(onProgress);
          let received = 0;

          response.on('data', (chunk: Buffer) => {
            received += chunk.length;
            notify(Math.min(100, Math.floor((received / total) * 100)));
          });
        }

        // Envia o conteúdo da resposta diretamente para o arquivo.
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(outputPath);
        });
      });

      request.on('error', (error) => {
        cleanup();

        reject(
          signal?.aborted
            ? abortError()
            : new Error(`Erro durante o download: ${error.message}`, {
                cause: error,
              }),
        );
      });

      // Cancelado: fecha a conexão e apaga o arquivo pela metade (nunca fica um vídeo cortado).
      signal?.addEventListener(
        'abort',
        () => {
          request.destroy();
          cleanup();
          reject(abortError());
        },
        { once: true },
      );
    });
  }

  async toAudio(
    videoPath: string,
    destinationDir: string = this.config.audioTempDir,
    onProgress?: PercentListener,
    signal?: AbortSignal,
  ): Promise<string> {
    try {
      fs.mkdirSync(destinationDir, { recursive: true });

      const videoFileName = path.basename(videoPath);
      const videoName = path.parse(videoFileName).name;

      const audioFileName = `${videoName}.wav`;
      const audioPath = path.resolve(destinationDir, audioFileName);

      const ffmpegArgs = [
        '-i',
        videoPath,
        // Remove o vídeo
        '-vn',
        // Áudio mono
        '-ac',
        '1',
        // 16 kHz, ideal para speech-to-text
        '-ar',
        '16000',
        // WAV PCM
        '-c:a',
        'pcm_s16le',

        audioPath,
      ];
      const ffmpeg = this.config.ffmpegPath?.() ?? 'ffmpeg';

      try {
        if (onProgress || signal) {
          await execStreaming(
            ffmpeg,
            ffmpegArgs,
            onProgress && ffmpegPercentTracker(onlyChanges(onProgress)),
            signal,
          );
        } else {
          await execFileAsync(ffmpeg, ffmpegArgs);
        }
      } catch (error) {
        // Cancelado ou falhou no meio: o áudio pela metade não pode ser tomado por pronto.
        await fs.promises.rm(audioPath, { force: true }).catch(() => undefined);

        throw error;
      }

      return audioPath;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      throw new Error('Falha ao converter o vídeo para áudio.', {
        cause: error,
      });
    }
  }

  async saveFile(
    transcription: string,
    fileName: string = 'transcription',
    fileExtension: string = '.md',
    destinationDir: string = this.config.inboxDir,
  ): Promise<string> {
    try {
      fs.mkdirSync(destinationDir, { recursive: true });

      const fileFullName = fileName + fileExtension;
      const outputPath = path.resolve(destinationDir, fileFullName);
      await fs.promises.writeFile(outputPath, transcription, 'utf-8');

      return outputPath;
    } catch (error) {
      throw new Error('Falha ao salvar a transcrição.', {
        cause: error,
      });
    }
  }

  async summarize(
    prompt: string,
    transcription: string,
    options: VideoSummarizeOptions,
  ): Promise<string> {
    try {
      const { providerId, modelId, thinking = 'off', detail, onRetry, signal } = options;

      // O resumo curto vai de uma vez; os detalhados resumem por partes para o
      // modelo não comprimir uma aula longa em poucos parágrafos.
      const chunks =
        detail && detail !== 'brief'
          ? splitText(transcription, SUMMARY_CHUNK_CHARS)
          : [transcription];

      const parts: string[] = [];

      for (const [index, chunk] of chunks.entries()) {
        if (signal?.aborted) {
          throw abortError();
        }

        const note = this.partNote(index, chunks.length, this.headingsOf(parts));

        parts.push(
          await this.aiService.chat({
            providerId,
            modelId,
            thinking,
            ...(onRetry ? { onRetry } : {}),
            ...(signal ? { signal } : {}),
            message: `
      ${prompt}
      ${note}${chunk}
      `,
          }),
        );
      }

      return parts.join('\n\n');
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      console.log(error);

      // O motivo (limite de uso, serviço ocupado...) vem na mensagem do provedor de IA.
      const reason = error instanceof Error && error.message ? ` ${error.message}` : '';

      throw new Error(`Falha ao gerar o resumo.${reason}`, {
        cause: error,
      });
    }
  }

  /** Títulos (##) já gerados nas partes anteriores, para a próxima não repeti-los. */
  private headingsOf(parts: string[]): string[] {
    return parts
      .join('\n')
      .split('\n')
      .filter((line) => /^##\s+\S/.test(line))
      .map((line) => line.replace(/^##\s+/, '').trim());
  }

  private partNote(index: number, total: number, covered: string[] = []): string {
    if (total <= 1) {
      return '';
    }

    const intro = `Esta é a parte ${index + 1} de ${total} de uma mesma aula. Resuma somente esta parte; as outras são resumidas separadamente.`;

    if (index === 0) {
      return `${intro}\n\n`;
    }

    const continuation = covered.length
      ? ` Seções já resumidas nas partes anteriores: ${covered.join('; ')}. Se esta parte continuar um desses assuntos, não repita o título nem as definições já dadas: acrescente só o que for novo.`
      : '';

    return `${intro} Não repita o título principal: comece direto pelas seções (##).${continuation}\n\n`;
  }

  async deleteVideo(videoPath: string): Promise<void> {
    try {
      await fs.promises.unlink(videoPath);
    } catch (error) {
      throw new Error('Falha ao remover o vídeo temporário.', {
        cause: error,
      });
    }
  }

  async deleteAudio(audioPath: string): Promise<void> {
    try {
      await fs.promises.unlink(audioPath);
    } catch (error) {
      throw new Error('Falha ao remover o áudio temporário.', {
        cause: error,
      });
    }
  }
}
