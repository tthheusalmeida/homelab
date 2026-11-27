import * as fs from 'node:fs';
import * as path from 'node:path';

import type { LocalAssistant } from '../back/config/local-assistant';

import type { ComponentInstaller, InstallContext } from './component-installer';
import type { ComponentSpec } from './component-manifest';

export const OllamaModelMessages = {
  pullFailed: 'Não foi possível baixar este assistente. Confira a conexão e tente de novo.',
  removeFailed: 'Não foi possível remover este assistente. Tente de novo.',
} as const;

export type PullFetch = (
  url: string,
  init: {
    method: 'POST' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<Response>;

export interface OllamaModelInstallerDeps {
  /** Onde o assistente guarda os modelos (a mesma pasta que o `OllamaRuntime` usa). */
  modelsDir: string;
  assistant: LocalAssistant;
  fetchFn: PullFetch;
  now?: () => number;
}

/** Intervalo mínimo entre dois avisos de andamento (o assistente manda dezenas por segundo). */
const PROGRESS_INTERVAL_MS = 150;

/**
 * Arquivo que prova que o modelo está instalado: o "manifesto" que o assistente grava ao terminar o
 * download (`<modelos>/manifests/registry.ollama.ai/library/<nome>/<tamanho>`). Ele só aparece com
 * o modelo completo, então a detecção não precisa ligar o assistente.
 */
export function manifestPath(modelsDir: string, ref: string): string {
  const [name, tag = 'latest'] = ref.split(':');
  const namespaced = name.includes('/') ? name : `library/${name}`;

  return path.join(modelsDir, 'manifests', 'registry.ollama.ai', ...namespaced.split('/'), tag);
}

interface PullLine {
  status?: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

function parseLine(line: string): PullLine | null {
  try {
    const value: unknown = JSON.parse(line);

    return typeof value === 'object' && value !== null ? value : null;
  } catch {
    return null;
  }
}

/**
 * Instala e remove os modelos do assistente local pela API dele: o download vem em fluxo, com o
 * andamento de cada parte do modelo, e pode ser cancelado (a parte já baixada fica e a próxima
 * tentativa continua de onde parou).
 */
export class OllamaModelInstaller implements ComponentInstaller {
  constructor(private readonly deps: OllamaModelInstallerDeps) {}

  handles(spec: ComponentSpec): boolean {
    return spec.kind === 'ollama-model';
  }

  isInstalled(spec: ComponentSpec): boolean {
    return fs.existsSync(manifestPath(this.deps.modelsDir, spec.file));
  }

  async install(spec: ComponentSpec, { signal, progress }: InstallContext): Promise<void> {
    await this.deps.assistant.ensureRunning();

    const response = await this.deps.fetchFn(`${this.deps.assistant.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: spec.file, stream: true }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(OllamaModelMessages.pullFailed);
    }

    const parts = new Map<string, number>();
    const now = this.deps.now ?? Date.now;
    let lastReport = 0;
    let finished = false;

    const handle = (line: PullLine): void => {
      if (line.error) {
        throw new Error(OllamaModelMessages.pullFailed);
      }

      if (line.status === 'success') {
        finished = true;
      }

      if (line.digest && typeof line.completed === 'number') {
        parts.set(line.digest, line.completed);
      }

      const received = [...parts.values()].reduce((sum, value) => sum + value, 0);

      if (now() - lastReport >= PROGRESS_INTERVAL_MS) {
        lastReport = now();
        progress(Math.min(received, spec.sizeBytes), spec.sizeBytes);
      }
    };

    const reader = response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const parsed = line.trim() === '' ? null : parseLine(line);

        if (parsed) {
          handle(parsed);
        }
      }
    }

    const last = buffer.trim() === '' ? null : parseLine(buffer);

    if (last) {
      handle(last);
    }

    if (!finished || !this.isInstalled(spec)) {
      throw new Error(OllamaModelMessages.pullFailed);
    }

    progress(spec.sizeBytes, spec.sizeBytes);
  }

  async remove(spec: ComponentSpec): Promise<void> {
    await this.deps.assistant.ensureRunning();

    const response = await this.deps.fetchFn(`${this.deps.assistant.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: spec.file }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(OllamaModelMessages.removeFailed);
    }
  }
}
