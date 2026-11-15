import type { ExternalProvidersService } from '../../providers/external-providers.service';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import type { SettingsService } from '../../settings/settings.service';
import type { IpcHandler } from '../ipc-handler';

import { AppHandler, type AppInfo } from './app.handler';
import { ExternalProvidersHandler } from './external-providers.handler';
import { LocalProvidersHandler } from './local-providers.handler';
import { SettingsHandler } from './settings.handler';

export interface HandlerDeps {
  appInfo: AppInfo;
  settings: SettingsService;
  externalProviders: ExternalProvidersService;
  localProviders: LocalProvidersService;
}

/** Lista única de handlers do app. Cada fase acrescenta os seus aqui. */
export function createHandlers(deps: HandlerDeps): IpcHandler[] {
  return [
    new AppHandler(deps.appInfo),
    new SettingsHandler(deps.settings),
    new ExternalProvidersHandler(deps.externalProviders),
    new LocalProvidersHandler(deps.localProviders),
  ];
}
