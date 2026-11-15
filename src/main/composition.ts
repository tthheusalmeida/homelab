import * as path from 'node:path';

import { ExternalProvidersService } from '../providers/external-providers.service';
import { createGeminiDefinition, type GeminiKeyChecker } from '../providers/gemini.definition';
import {
  createFfmpegDefinition,
  createOllamaDefinition,
  createWhisperDefinition,
} from '../providers/local-definitions';
import { LocalProvidersService } from '../providers/local-providers.service';
import { DesktopWhisperService, type WhisperRunner } from '../providers/desktop-whisper.service';
import { WhisperBinaryResolver } from '../providers/whisper-binary-resolver';
import { JsonFile } from '../settings/json-file';
import { SecretStore, type SecretCipher } from '../settings/secret-store';
import { createDefaultSettings } from '../settings/settings-defaults';
import { SettingsService } from '../settings/settings.service';
import { SettingsStore } from '../settings/settings-store';

import { DATA_ROOT_FOLDER, DataFiles } from './constants';
import { resolveBinDir } from './paths';

export interface CompositionOptions {
  userDataDir: string;
  documentsDir: string;
  projectRoot: string;
  platform: NodeJS.Platform;
  arch: string;
  cipher: SecretCipher;
  exists: (file: string) => boolean;
  fetchFn: Parameters<typeof createOllamaDefinition>[0];
  ffmpegVersion: () => Promise<string>;
  checkGeminiKey: GeminiKeyChecker;
  /** Entrada e saída do Whisper: executar o programa e ler/apagar o `.txt` gerado. */
  whisperIo: {
    run: WhisperRunner;
    readText: (file: string) => Promise<string>;
    remove: (file: string) => Promise<void>;
  };
}

/** Monta stores e serviços de configuração a partir de dependências injetadas. */
export function createServices(options: CompositionOptions) {
  const defaults = createDefaultSettings({
    rootDir: path.join(options.documentsDir, DATA_ROOT_FOLDER),
    whisperDir: resolveBinDir(options.projectRoot, options.platform, options.arch),
    platform: options.platform,
  });

  const settings = new SettingsStore(
    new JsonFile(path.join(options.userDataDir, DataFiles.settings)),
    defaults,
  );
  const secrets = new SecretStore(
    new JsonFile(path.join(options.userDataDir, DataFiles.secrets)),
    options.cipher,
  );

  const whisper = new DesktopWhisperService({
    config: () => settings.get().local.whisper,
    resolver: new WhisperBinaryResolver({
      platform: options.platform,
      arch: options.arch,
      exists: options.exists,
    }),
    run: options.whisperIo.run,
    files: {
      exists: options.exists,
      readText: options.whisperIo.readText,
      remove: options.whisperIo.remove,
    },
  });

  return {
    settings,
    secrets,
    whisper,
    settingsService: new SettingsService(settings),
    externalProviders: new ExternalProvidersService(
      [createGeminiDefinition(options.checkGeminiKey)],
      secrets,
    ),
    localProviders: new LocalProvidersService(
      [
        createWhisperDefinition(options.exists),
        createOllamaDefinition(options.fetchFn),
        createFfmpegDefinition(options.ffmpegVersion),
      ],
      settings,
    ),
  };
}
