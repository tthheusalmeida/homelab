import type { ExternalProvidersService } from '../../providers/external-providers.service';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import type { SettingsService } from '../../settings/settings.service';
import type { IpcHandler } from '../ipc-handler';

import { AiHandler, type AiCatalog, type AiUsageSource } from './ai.handler';
import { AppHandler, type AppInfo } from './app.handler';
import { ExternalProvidersHandler } from './external-providers.handler';
import { HealthHandler, type HealthCheckSource } from './health.handler';
import { LocalProvidersHandler } from './local-providers.handler';
import { SettingsHandler, type FolderPicker } from './settings.handler';

/** Services do back (Nest) usados pelos handlers de leitura. */
export interface BackReaders {
  healthSystem: HealthCheckSource;
  healthAi: HealthCheckSource;
  ai: AiCatalog;
  aiUsage: AiUsageSource;
}

export interface HandlerDeps {
  appInfo: AppInfo;
  folderPicker: FolderPicker;
  settings: SettingsService;
  externalProviders: ExternalProvidersService;
  localProviders: LocalProvidersService;
  back: BackReaders;
}

/** Lista única de handlers do app. Cada fase acrescenta os seus aqui. */
export function createHandlers(deps: HandlerDeps): IpcHandler[] {
  return [
    new AppHandler(deps.appInfo),
    new SettingsHandler(deps.settings, deps.folderPicker),
    new ExternalProvidersHandler(deps.externalProviders),
    new LocalProvidersHandler(deps.localProviders),
    new HealthHandler(deps.back.healthSystem, deps.back.healthAi),
    new AiHandler(deps.back.ai, deps.back.aiUsage),
  ];
}
