import type { SecretStore } from './secret-store';
import { buildSeed, parseDotenv } from './env-seed';
import type { SettingsStore } from './settings-store';

export interface LegacyEnvImportDeps {
  settings: SettingsStore;
  secrets: SecretStore;
  envFile: string;
  exists: (file: string) => boolean;
  readFile: (file: string) => string;
}

/**
 * Importa o `.env` antigo do back **uma vez**, na primeira execução em desenvolvimento,
 * para não precisar redigitar tudo. Devolve `true` se importou algo. Qualquer problema
 * (arquivo ilegível, valor inválido, sem criptografia) é ignorado: o app abre com os padrões.
 * Some junto com o `.env` na fase 09.
 */
export async function importLegacyEnv({
  settings,
  secrets,
  envFile,
  exists,
  readFile,
}: LegacyEnvImportDeps): Promise<boolean> {
  if (!settings.isFirstRun() || !exists(envFile)) {
    return false;
  }

  try {
    const seed = buildSeed(parseDotenv(readFile(envFile)));

    settings.update(seed.settings);

    if (seed.geminiApiKey) {
      await secrets.set('gemini.apiKey', seed.geminiApiKey);
    }

    return true;
  } catch {
    return false;
  }
}
