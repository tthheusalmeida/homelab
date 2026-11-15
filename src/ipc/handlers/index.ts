import type { IpcHandler } from '../ipc-handler';

import { AppHandler, type AppInfo } from './app.handler';

export interface HandlerDeps {
  appInfo: AppInfo;
}

/** Lista única de handlers do app. Cada fase acrescenta os seus aqui. */
export function createHandlers(deps: HandlerDeps): IpcHandler[] {
  return [new AppHandler(deps.appInfo)];
}
