import * as fs from 'node:fs';
import * as path from 'node:path';

import type { LocalAssistant } from '../back/config/local-assistant';

/**
 * Porta privada do assistente local. É diferente da padrão do Ollama (11434), então um Ollama que o
 * usuário já tenha instalado por conta própria continua funcionando ao lado, sem conflito.
 */
export const LOCAL_ASSISTANT_PORT = 11435;

export const OllamaRuntimeMessages = {
  notInstalled:
    'O assistente local ainda não foi instalado. Instale-o em Configurações > Componentes.',
  failedToStart: 'O assistente local não conseguiu iniciar. Tente de novo ou reinicie o app.',
  tooSlow: 'O assistente local demorou demais para iniciar. Tente de novo em instantes.',
} as const;

/** O que o gerenciador precisa de um processo filho. */
export interface RuntimeChild {
  pid?: number;
  once(event: 'exit', listener: () => void): unknown;
  kill(signal?: NodeJS.Signals): boolean;
}

export type SpawnProcess = (
  command: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; windowsHide: boolean; stdio: 'ignore' },
) => RuntimeChild;

export type PingFetch = (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean }>;

export interface OllamaRuntimeDeps {
  /** Pasta do programa já extraído (`<pacotes>/ollama`). */
  programDir: string;
  /** Onde o assistente guarda os modelos (dados do usuário, fora da pasta do app). */
  modelsDir: string;
  platform: NodeJS.Platform;
  spawnProcess: SpawnProcess;
  ping: PingFetch;
  /** Encerra o processo e os que ele abriu (no Windows, `taskkill /T`); sem ela, só `kill`. */
  killTree?: (pid: number) => void;
  port?: number;
  /** Quanto esperar o assistente responder depois de ligado (ms). */
  readyTimeoutMs?: number;
  pollMs?: number;
  wait?: (ms: number) => Promise<void>;
  exists?: (file: string) => boolean;
}

const DEFAULT_READY_TIMEOUT_MS = 90_000;
const DEFAULT_POLL_MS = 300;
const PING_TIMEOUT_MS = 1_500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Liga e desliga o assistente local (o programa que o app instalou) numa porta privada. Liga
 * **só quando alguém precisa** (a lista de modelos, uma conversa, baixar um modelo) e desliga ao
 * fechar o app; enquanto está ocioso, o próprio assistente descarrega o modelo da memória. Várias
 * chamadas ao mesmo tempo dividem a mesma partida.
 */
export class OllamaRuntime implements LocalAssistant {
  readonly baseUrl: string;

  private child: RuntimeChild | null = null;
  private starting: Promise<void> | null = null;

  constructor(private readonly deps: OllamaRuntimeDeps) {
    this.baseUrl = `http://127.0.0.1:${deps.port ?? LOCAL_ASSISTANT_PORT}`;
  }

  /** Caminho do programa. */
  executable(): string {
    return path.join(
      this.deps.programDir,
      this.deps.platform === 'win32' ? 'ollama.exe' : 'ollama',
    );
  }

  isInstalled(): boolean {
    return (this.deps.exists ?? fs.existsSync)(this.executable());
  }

  ensureRunning(): Promise<void> {
    if (!this.isInstalled()) {
      return Promise.reject(new Error(OllamaRuntimeMessages.notInstalled));
    }

    this.starting ??= this.start().finally(() => {
      this.starting = null;
    });

    return this.starting;
  }

  /** Desliga o assistente (se foi o app que o ligou). */
  stop(): void {
    const child = this.child;

    this.child = null;

    if (!child) {
      return;
    }

    if (this.deps.killTree && child.pid !== undefined) {
      this.deps.killTree(child.pid);
    } else {
      child.kill();
    }
  }

  private async start(): Promise<void> {
    if (await this.isUp()) {
      return;
    }

    const child = this.child ?? this.launch();
    let exited = false;

    child.once('exit', () => {
      exited = true;
    });

    const wait = this.deps.wait ?? sleep;
    const poll = this.deps.pollMs ?? DEFAULT_POLL_MS;
    const limit = this.deps.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;

    for (let waited = 0; waited <= limit; waited += poll) {
      if (await this.isUp()) {
        return;
      }

      if (exited) {
        throw new Error(OllamaRuntimeMessages.failedToStart);
      }

      await wait(poll);
    }

    throw new Error(OllamaRuntimeMessages.tooSlow);
  }

  private launch(): RuntimeChild {
    const child = this.deps.spawnProcess(this.executable(), ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: this.baseUrl.replace('http://', ''),
        OLLAMA_MODELS: this.deps.modelsDir,
      },
      windowsHide: true,
      stdio: 'ignore',
    });

    this.child = child;
    child.once('exit', () => {
      if (this.child === child) {
        this.child = null;
      }
    });

    return child;
  }

  private async isUp(): Promise<boolean> {
    try {
      const response = await this.deps.ping(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
