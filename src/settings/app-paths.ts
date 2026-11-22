import * as path from 'node:path';

import type { WhisperConfig } from '../shared/contracts/settings';

import { DEFAULT_WHISPER_MODEL } from './settings-defaults';

/** Nome das subpastas da raiz de dados (ver `docs/persistencia.md`). */
export const RootFolders = {
  library: 'library',
  inbox: 'inbox',
  data: 'data',
  config: 'config',
  temp: 'temp',
} as const;

/** Arquivos de estado dentro de `data/` e `config/`. */
export const StateFiles = {
  settings: 'settings.json',
  jobs: 'jobs.json',
  chats: 'chats.json',
  usage: 'ai-usage.json',
  mindMaps: 'mind-maps.json',
  infographics: 'infographics.json',
  prompts: 'prompts.json',
} as const;

/**
 * Pastas **fixas** do app, todas derivadas da raiz de dados (padrão: Documentos/HomeLab). Só a
 * biblioteca pode ser trocada pelo usuário (fica no `settings.json`); `defaultLibraryDir` é o padrão.
 */
export interface AppPaths {
  rootDir: string;
  defaultLibraryDir: string;
  inboxDir: string;
  videoTempDir: string;
  audioTempDir: string;
  pdfWorkDir: string;
  dataDir: string;
  configDir: string;
  settingsFile: string;
  jobsFile: string;
  chatsFile: string;
  usageFile: string;
  mindMapsFile: string;
  infographicsFile: string;
  /** Prompts personalizados (em `config/`, junto com as configurações). */
  promptsFile: string;
}

export function createAppPaths(rootDir: string): AppPaths {
  const dataDir = path.join(rootDir, RootFolders.data);
  const configDir = path.join(rootDir, RootFolders.config);
  const tempDir = path.join(rootDir, RootFolders.temp);

  return {
    rootDir,
    defaultLibraryDir: path.join(rootDir, RootFolders.library),
    inboxDir: path.join(rootDir, RootFolders.inbox),
    videoTempDir: path.join(tempDir, 'video'),
    audioTempDir: path.join(tempDir, 'audio'),
    pdfWorkDir: path.join(tempDir, 'pdf'),
    dataDir,
    configDir,
    settingsFile: path.join(configDir, StateFiles.settings),
    jobsFile: path.join(dataDir, StateFiles.jobs),
    chatsFile: path.join(dataDir, StateFiles.chats),
    usageFile: path.join(dataDir, StateFiles.usage),
    mindMapsFile: path.join(dataDir, StateFiles.mindMaps),
    infographicsFile: path.join(dataDir, StateFiles.infographics),
    promptsFile: path.join(configDir, StateFiles.prompts),
  };
}

/** Whisper com os padrões do app (pasta de binários da plataforma): não é configurável. */
export function createWhisperConfig(whisperDir: string, platform: NodeJS.Platform): WhisperConfig {
  return {
    directory: whisperDir,
    executable: platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
    model: DEFAULT_WHISPER_MODEL,
  };
}
