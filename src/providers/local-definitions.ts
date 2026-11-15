import * as path from 'node:path';

import type { LocalProviderDefinition } from './local-providers.service';

export const LocalTestMessages = {
  whisperOk: 'Whisper e modelo encontrados.',
  whisperExecutableMissing: (file: string) => `Executável do Whisper não encontrado: ${file}`,
  whisperModelMissing: (file: string) => `Modelo do Whisper não encontrado: ${file}`,
  ollamaOk: 'Ollama respondeu.',
  ollamaStatus: (status: number) => `O Ollama respondeu com status ${status}.`,
  ollamaUnreachable: (url: string) => `Não foi possível conectar ao Ollama em ${url}.`,
  ffmpegUnavailable: 'ffmpeg não encontrado. Instale-o e deixe-o no PATH do sistema.',
} as const;

const OLLAMA_TIMEOUT_MS = 5000;

const pickDefined = (config: Record<string, string>, keys: string[]) =>
  Object.fromEntries(keys.filter((key) => config[key] !== undefined).map((k) => [k, config[k]]));

export function createWhisperDefinition(
  exists: (file: string) => boolean,
): LocalProviderDefinition {
  return {
    id: 'whisper',
    label: 'Whisper',
    editable: true,
    read: ({ local }) => ({ ...local.whisper }),
    toPatch: (config) => ({
      local: { whisper: pickDefined(config, ['directory', 'executable', 'model']) },
    }),
    test: (config) => {
      const executable = path.join(config.directory, config.executable);
      const model = path.join(config.directory, config.model);

      if (!exists(executable)) {
        return Promise.resolve({
          ok: false,
          message: LocalTestMessages.whisperExecutableMissing(executable),
        });
      }

      if (!exists(model)) {
        return Promise.resolve({
          ok: false,
          message: LocalTestMessages.whisperModelMissing(model),
        });
      }

      return Promise.resolve({ ok: true, message: LocalTestMessages.whisperOk });
    },
  };
}

export function createOllamaDefinition(
  fetchFn: (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; status: number }>,
): LocalProviderDefinition {
  return {
    id: 'ollama',
    label: 'Ollama',
    editable: true,
    read: ({ local }) => ({ ...local.ollama }),
    toPatch: (config) => ({ local: { ollama: pickDefined(config, ['url']) } }),
    test: async (config) => {
      const url = config.url.replace(/\/+$/, '');

      try {
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

/** O back chama `ffmpeg` pelo PATH; por isso aqui só é possível testar, não configurar. */
export function createFfmpegDefinition(version: () => Promise<string>): LocalProviderDefinition {
  return {
    id: 'ffmpeg',
    label: 'ffmpeg',
    editable: false,
    read: () => ({}),
    toPatch: () => ({}),
    test: async () => {
      try {
        const firstLine = (await version()).split(/\r?\n/)[0]?.trim();

        return { ok: true, message: firstLine || 'ffmpeg encontrado.' };
      } catch {
        return { ok: false, message: LocalTestMessages.ffmpegUnavailable };
      }
    },
  };
}
