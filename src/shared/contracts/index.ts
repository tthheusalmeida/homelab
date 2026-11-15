import type { IpcChannel, IpcChannels } from '../channels';

import type {
  ExternalProviderInfo,
  ExternalProviderSaveRequest,
  ExternalProviderSaveResult,
  ExternalProviderTestRequest,
  LocalProviderInfo,
  LocalProviderSaveRequest,
  LocalProviderSaveResult,
  LocalProviderTestRequest,
  ProviderTestResult,
} from './providers';
import type { SaveResult, SettingsPaths } from './settings';

/**
 * Contrato de cada canal: payload (`request`) e retorno (`response`).
 * Cada fase acrescenta aqui os canais do seu domínio.
 */
export interface IpcContracts {
  [IpcChannels.app.ping]: { request: void; response: 'pong' };
  [IpcChannels.app.version]: { request: void; response: string };
  [IpcChannels.app.relaunch]: { request: void; response: void };
  [IpcChannels.app.openSettings]: { request: void; response: void };

  [IpcChannels.settings.get]: { request: void; response: SettingsPaths };
  [IpcChannels.settings.update]: {
    request: Partial<SettingsPaths>;
    response: SaveResult<SettingsPaths>;
  };

  /** Abre o seletor de pasta do sistema; `null` se o usuário cancelar. */
  [IpcChannels.settings.pickFolder]: {
    request: { defaultPath?: string };
    response: string | null;
  };

  [IpcChannels.providers.external.list]: { request: void; response: ExternalProviderInfo[] };
  [IpcChannels.providers.external.get]: {
    request: { id: ExternalProviderInfo['id'] };
    response: ExternalProviderInfo;
  };
  [IpcChannels.providers.external.save]: {
    request: ExternalProviderSaveRequest;
    response: ExternalProviderSaveResult;
  };
  [IpcChannels.providers.external.test]: {
    request: ExternalProviderTestRequest;
    response: ProviderTestResult;
  };

  [IpcChannels.providers.local.list]: { request: void; response: LocalProviderInfo[] };
  [IpcChannels.providers.local.get]: {
    request: { id: LocalProviderInfo['id'] };
    response: LocalProviderInfo;
  };
  [IpcChannels.providers.local.save]: {
    request: LocalProviderSaveRequest;
    response: LocalProviderSaveResult;
  };
  [IpcChannels.providers.local.test]: {
    request: LocalProviderTestRequest;
    response: ProviderTestResult;
  };
}

export type IpcRequest<C extends IpcChannel> = IpcContracts[C]['request'];
export type IpcResponse<C extends IpcChannel> = IpcContracts[C]['response'];
