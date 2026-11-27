import * as path from 'node:path';

import type { LocalAssistant } from '../back/config/local-assistant';
import { DEFAULT_OLLAMA_URL } from '../settings/settings-defaults';
import type { WhisperConfig } from '../shared/contracts/settings';
import type { LocalProviderDefinition } from './local-providers.service';
import { whisperModelPath } from './whisper-binary-resolver';

export const LocalTestMessages = {
  whisperOk: 'Transcrição pronta para uso.',
  whisperExecutableMissing:
    'A transcrição não está instalada. Instale-a em Configurações > Componentes.',
  whisperModelMissing:
    'Nenhum modelo de transcrição instalado. Instale um em Configurações > Componentes.',
  ffmpegOk: 'Processamento de áudio pronto para uso.',
  ollamaOk: 'Ollama respondeu.',
  ollamaStatus: (status: number) => `O Ollama respondeu com status ${status}.`,
  ollamaUnreachable: (url: string) => `Não foi possível conectar ao Ollama em ${url}.`,
  ffmpegUnavailable:
    'O processamento de áudio não foi encontrado. Instale-o em Configurações > Componentes.',
} as const;

const OLLAMA_TIMEOUT_MS = 5000;

const pickDefined = (config: Record<string, string>, keys: string[]) =>
  Object.fromEntries(keys.filter((key) => config[key] !== undefined).map((k) => [k, config[k]]));

/** Whisper com os padrões do app (pasta de binários, executável e modelo): só dá para testar. */
export function createWhisperDefinition(
  exists: (file: string) => boolean,
  configOrGetter: WhisperConfig | (() => WhisperConfig),
): LocalProviderDefinition {
  return {
    id: 'whisper',
    label: 'Transcrição',
    editable: false,
    read: () => ({}),
    toPatch: () => ({}),
    test: () => {
      const config = typeof configOrGetter === 'function' ? configOrGetter() : configOrGetter;
      const executable = path.join(config.directory, config.executable);
      const model = whisperModelPath(config.directory, config.model);

      if (!exists(executable)) {
        return Promise.resolve({
          ok: false,
          message: LocalTestMessages.whisperExecutableMissing,
        });
      }

      if (!exists(model)) {
        return Promise.resolve({
          ok: false,
          message: LocalTestMessages.whisperModelMissing,
        });
      }

      return Promise.resolve({ ok: true, message: LocalTestMessages.whisperOk });
    },
  };
}

export function createOllamaDefinition(
  fetchFn: (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; status: number }>,
  /** O assistente local instalado pelo app: com o endereço padrão, é ele que é testado (e ligado se preciso). */
  assistant?: LocalAssistant,
): LocalProviderDefinition {
  return {
    id: 'ollama',
    label: 'Ollama',
    editable: true,
    read: ({ local }) => ({ ...local.ollama }),
    toPatch: (config) => ({ local: { ollama: pickDefined(config, ['url']) } }),
    test: async (config) => {
      const managed =
        assistant?.isInstalled() && config.url === DEFAULT_OLLAMA_URL ? assistant : null;
      const url = (managed?.baseUrl ?? config.url).replace(/\/+$/, '');

      try {
        await managed?.ensureRunning();

        const response = await fetchFn(`${url}/api/tags`, {
          signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
        });

        return response.ok
          ? { ok: true, message: LocalTestMessages.ollamaOk }
          : { ok: false, message: LocalTestMessages.ollamaStatus(response.status) };
      } catch {
        return { ok: false, message: LocalTestMessages.ollamaUnreachable(url) };
      }
    },
  };
}

/** O app usa o ffmpeg instalado pelo assistente (ou o do PATH); aqui só é possível testar, não configurar. */
export function createFfmpegDefinition(version: () => Promise<string>): LocalProviderDefinition {
  return {
    id: 'ffmpeg',
    label: 'Processamento de áudio',
    editable: false,
    read: () => ({}),
    toPatch: () => ({}),
    test: async () => {
      try {
        await version();

        return { ok: true, message: LocalTestMessages.ffmpegOk };
      } catch {
        return { ok: false, message: LocalTestMessages.ffmpegUnavailable };
      }
    },
  };
}
