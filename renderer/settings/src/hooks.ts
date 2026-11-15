import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IpcChannels } from '#shared/channels';
import type {
  ExternalProviderSaveRequest,
  ExternalProviderTestRequest,
  LocalProviderSaveRequest,
  LocalProviderTestRequest,
} from '#shared/contracts/providers';
import type { SettingsPaths } from '#shared/contracts/settings';
import { ipc } from '#lib/ipc';

export const QueryKeys = {
  paths: ['settings', 'paths'],
  external: ['providers', 'external'],
  local: ['providers', 'local'],
} as const;

export function usePaths() {
  return useQuery({
    queryKey: QueryKeys.paths,
    queryFn: () => ipc.invoke(IpcChannels.settings.get),
  });
}

export function useSavePaths() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<SettingsPaths>) => ipc.invoke(IpcChannels.settings.update, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QueryKeys.paths }),
  });
}

export function pickFolder(defaultPath?: string) {
  return ipc.invoke(IpcChannels.settings.pickFolder, { defaultPath });
}

export function useExternalProviders() {
  return useQuery({
    queryKey: QueryKeys.external,
    queryFn: () => ipc.invoke(IpcChannels.providers.external.list),
  });
}

export function useSaveExternalProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ExternalProviderSaveRequest) =>
      ipc.invoke(IpcChannels.providers.external.save, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QueryKeys.external }),
  });
}

export function useTestExternalProvider() {
  return useMutation({
    mutationFn: (request: ExternalProviderTestRequest) =>
      ipc.invoke(IpcChannels.providers.external.test, request),
  });
}

export function useLocalProviders() {
  return useQuery({
    queryKey: QueryKeys.local,
    queryFn: () => ipc.invoke(IpcChannels.providers.local.list),
  });
}

export function useSaveLocalProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LocalProviderSaveRequest) =>
      ipc.invoke(IpcChannels.providers.local.save, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QueryKeys.local }),
  });
}

export function useTestLocalProvider() {
  return useMutation({
    mutationFn: (request: LocalProviderTestRequest) =>
      ipc.invoke(IpcChannels.providers.local.test, request),
  });
}

export function relaunchApp() {
  return ipc.invoke(IpcChannels.app.relaunch);
}
