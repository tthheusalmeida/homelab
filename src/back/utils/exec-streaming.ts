import { spawn } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Como o `execFile`, mas repassa cada pedaço de texto que o programa escreve enquanto roda
 * (`onText`), para acompanhar o andamento. Falha com `stdout`/`stderr` no erro, como o `execFile`.
 */
export function execStreaming(
  file: string,
  args: string[],
  onText?: (text: string) => void,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

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
    child.on('error', reject);
    child.on('close', (code) => {
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
