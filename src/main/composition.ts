import * as path from 'node:path';

import type { EventPublisher } from '../ipc/event-publisher';

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
import { createAppPaths, createWhisperConfig } from '../settings/app-paths';
import { JsonFile } from '../storage/json-file';
import { LibraryMover } from '../settings/library-mover';
import { SecretStore, type SecretCipher } from '../settings/secret-store';
import { createDefaultSettings } from '../settings/settings-defaults';
import { SettingsService } from '../settings/settings.service';
import { SettingsStore } from '../settings/settings-store';
import { throttleProgress } from '../storage/tree';
import { IpcEvents } from '../shared/events';

import { DataFiles } from './constants';
import { resolveBinDir } from './paths';

export interface CompositionOptions {
  userDataDir: string;
  /** Raiz dos dados (Documentos/HomeLab, ou a trocada por `HOMELAB_DATA_ROOT_DIR`). */
  rootDir: string;
  /** Pasta `resources` (do projeto em dev, ao lado do executável no instalador). */
  resourcesDir: string;
  platform: NodeJS.Platform;
  arch: string;
  cipher: SecretCipher;
  exists: (file: string) => boolean;
  fetchFn: Parameters<typeof createOllamaDefinition>[0];
  ffmpegVersion: () => Promise<string>;
  checkGeminiKey: GeminiKeyChecker;
  /** Envia eventos (progresso, avisos) às janelas abertas. */
  events: EventPublisher;
  /** Entrada e saída do Whisper: executar o programa e ler/apagar o `.txt` gerado. */
  whisperIo: {
    run: WhisperRunner;
    readText: (file: string) => Promise<string>;
    remove: (file: string) => Promise<void>;
  };
}

/** Monta stores e serviços de configuração a partir de dependências injetadas. */
export function createServices(options: CompositionOptions) {
  const appPaths = createAppPaths(options.rootDir);
  const whisperConfig = createWhisperConfig(
    resolveBinDir(options.resourcesDir, options.platform, options.arch),
    options.platform,
  );

  const settings = new SettingsStore(
    new JsonFile(appPaths.settingsFile),
    createDefaultSettings({ libraryDir: appPaths.defaultLibraryDir }),
  );
  const secrets = new SecretStore(
    new JsonFile(path.join(options.userDataDir, DataFiles.secrets)),
    options.cipher,
  );

  const whisper = new DesktopWhisperService({
    config: () => whisperConfig,
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

  const libraryMover = new LibraryMover(
    {
      getLibraryDir: () => settings.get().paths.libraryDir,
      setLibraryDir: (libraryDir) => {
        settings.update({ paths: { libraryDir } });
      },
    },
    throttleProgress((progress) => options.events.publish(IpcEvents.libraryMoveProgress, progress)),
  );

  return {
    appPaths,
    libraryMover,
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
        createWhisperDefinition(options.exists, whisperConfig),
        createOllamaDefinition(options.fetchFn),
        createFfmpegDefinition(options.ffmpegVersion),
      ],
      settings,
    ),
  };
}
