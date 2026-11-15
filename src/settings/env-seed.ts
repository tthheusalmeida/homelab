import type { SettingsPatch } from '../shared/contracts/settings';

/** Nomes das variáveis do `.env` do back (usado só para importar a configuração antiga). */
export const LegacyEnvKeys = {
  LIB_DIR: 'LIB_DIR',
  TEMP_DOCS_DIR: 'TEMP_DOCS_DIR',
  TEMP_VIDEO_DIR: 'TEMP_VIDEO_DIR',
  TEMP_AUDIO_DIR: 'TEMP_AUDIO_DIR',
  WHISPER_DIR: 'WHISPER_DIR',
  WHISPER_EXECUTABLE: 'WHISPER_EXECUTABLE',
  WHISPER_MODEL: 'WHISPER_MODEL',
  OLLAMA_URL: 'OLLAMA_URL',
  GEMINI_API_KEY: 'GEMINI_API_KEY',
} as const;

/** Lê um `.env` simples: `CHAVE=valor`, comentários com `#`, aspas opcionais, CRLF. */
export function parseDotenv(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');

    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export interface EnvSeed {
  settings: SettingsPatch;
  geminiApiKey: string | null;
}

/** Converte as variáveis do `.env` antigo nas configurações novas (ignora o que estiver vazio). */
export function buildSeed(env: Record<string, string>): EnvSeed {
  const pick = (key: string) => env[key]?.trim() || undefined;
  const compact = <T extends object>(value: T): T | undefined =>
    Object.values(value).some((entry) => entry !== undefined) ? value : undefined;

  const paths = compact({
    libraryDir: pick(LegacyEnvKeys.LIB_DIR),
    inboxDir: pick(LegacyEnvKeys.TEMP_DOCS_DIR),
    videoTempDir: pick(LegacyEnvKeys.TEMP_VIDEO_DIR),
    audioTempDir: pick(LegacyEnvKeys.TEMP_AUDIO_DIR),
  });
  const whisper = compact({
    directory: pick(LegacyEnvKeys.WHISPER_DIR),
    executable: pick(LegacyEnvKeys.WHISPER_EXECUTABLE),
    model: pick(LegacyEnvKeys.WHISPER_MODEL),
  });
  const ollama = compact({ url: pick(LegacyEnvKeys.OLLAMA_URL) });

  return {
    settings: {
      ...(paths && { paths: stripUndefined(paths) }),
      ...((whisper || ollama) && {
        local: {
          ...(whisper && { whisper: stripUndefined(whisper) }),
          ...(ollama && { ollama: stripUndefined(ollama) }),
        },
      }),
    },
    geminiApiKey: pick(LegacyEnvKeys.GEMINI_API_KEY) ?? null,
  };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
