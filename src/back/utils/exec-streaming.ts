import { spawn, type ChildProcess } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/** Erro de uma operação interrompida por `AbortSignal` (cancelar um job). */
export function abortError(): Error {
  return Object.assign(new Error('Operação cancelada.'), { name: 'AbortError' });
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/**
 * Encerra o programa **e os que ele abriu** (o yt-dlp chama o ffmpeg, por exemplo). No Windows,
 * matar só o processo pai deixa os filhos rodando e segurando os arquivos; `taskkill /T` leva a
 * árvore toda.
 */
function killTree(child: ChildProcess): void {
  if (child.pid === undefined) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).on(
      'error',
      () => child.kill(),
    );

    return;
  }

  child.kill('SIGKILL');
}

/**
 * Como o `execFile`, mas repassa cada pedaço de texto que o programa escreve enquanto roda
 * (`onText`), para acompanhar o andamento, e para na hora se o `signal` for abortado. Falha com
 * `stdout`/`stderr` no erro, como o `execFile`; ao cancelar, falha com `AbortError`.
 */
export function execStreaming(
  file: string,
  args: string[],
  onText?: (text: string) => void,
  signal?: AbortSignal,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());

      return;
    }

    const child = spawn(file, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const stop = () => killTree(child);

    signal?.addEventListener('abort', stop, { once: true });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (text: string) => {
      stdout += text;
      onText?.(text);
    });
    child.stderr.on('data', (text: string) => {
      stderr += text;
      onText?.(text);
    });
    child.on('error', (error) => {
      signal?.removeEventListener('abort', stop);
      reject(error);
    });
    child.on('close', (code) => {
      signal?.removeEventListener('abort', stop);

      if (signal?.aborted) {
        reject(abortError());

        return;
      }

      if (code === 0) {
        resolve({ stdout, stderr });

        return;
      }

      reject(
        Object.assign(new Error(`Command failed: ${file} (código ${code})`), {
          code,
          stdout,
          stderr,
        }),
      );
    });
  });
}
