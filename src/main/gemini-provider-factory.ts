import { IpcError, IpcErrorCode } from '../shared/errors';

export const GeminiFactoryMessages = {
  notConfigured: 'Chave da API do Gemini não configurada. Abra Configurações e informe a chave.',
} as const;

/**
 * Substitui o `GeminiProvider` quando não há chave: o app abre normalmente e cada
 * uso do Gemini responde `NOT_CONFIGURED` (o provider real lançaria no construtor).
 */
export class MissingKeyGeminiProvider {
  readonly name = 'gemini' as const;

  health() {
    return Promise.resolve({
      service: 'gemini',
      description: 'Google Gemini API',
      status: 'error' as const,
    });
  }

  chat(): Promise<string> {
    return this.reject();
  }

  models(): Promise<never[]> {
    return this.reject();
  }

  thinking(): Promise<never[]> {
    return this.reject();
  }

  private reject(): Promise<never> {
    return Promise.reject(
      new IpcError(IpcErrorCode.NOT_CONFIGURED, GeminiFactoryMessages.notConfigured),
    );
  }
}

export interface GeminiProviderFactoryOptions {
  apiKey: string | null;
  /** Construtor do `GeminiProvider` real, vindo do back. */
  providerClass: new (usage: unknown) => unknown;
  usage: unknown;
  env: Record<string, string | undefined>;
}

/**
 * Com chave: cria o provider real. O back lê `process.env.GEMINI_API_KEY` ao construir,
 * então a variável existe só durante a criação e é removida logo depois (não vaza
 * para processos filhos como ffmpeg e Whisper).
 */
export function createGeminiProvider({
  apiKey,
  providerClass,
  usage,
  env,
}: GeminiProviderFactoryOptions): unknown {
  if (!apiKey) {
    return new MissingKeyGeminiProvider();
  }

  env.GEMINI_API_KEY = apiKey;

  try {
    return new providerClass(usage);
  } finally {
    delete env.GEMINI_API_KEY;
  }
}
