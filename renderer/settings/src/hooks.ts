import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IpcChannels } from '#shared/channels';
import type {
  ExternalProviderSaveRequest,
  ExternalProviderTestRequest,
  LocalProviderSaveRequest,
  LocalProviderTestRequest,
} from '#shared/contracts/providers';
import type {
  BackupCreateRequest,
  BackupRestoreRequest,
} from '#shared/contracts/backup';
import type {
  PromptActivateRequest,
  PromptDeleteRequest,
  PromptSaveRequest,
  PromptsOverview,
} from '#shared/contracts/prompts';
import type { MoveLibraryRequest } from '#shared/contracts/settings';
import { ipc } from '#lib/ipc';

export const QueryKeys = {
  paths: ['settings', 'paths'],
  external: ['providers', 'external'],
  local: ['providers', 'local'],
  backupPreview: ['backup', 'preview'],
  prompts: ['prompts'],
} as const;

export function usePaths() {
  return useQuery({
    queryKey: QueryKeys.paths,
    queryFn: () => ipc.invoke(IpcChannels.settings.get),
  });
}

/** Diz o que há na pasta escolhida para a biblioteca (vazia, com arquivos...). */
export function useInspectLibrary() {
  return useMutation({
    mutationFn: (request: { path: string }) =>
      ipc.invoke(IpcChannels.settings.inspectLibrary, request),
  });
}

/** Troca a pasta da biblioteca (mover a atual ou só usar a escolhida). */
export function useMoveLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MoveLibraryRequest) =>
      ipc.invoke(IpcChannels.settings.moveLibrary, request),
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

/** O que dá para incluir no backup, com tamanhos; sempre recalculado ao abrir a seção. */
export function useBackupPreview() {
  return useQuery({
    queryKey: QueryKeys.backupPreview,
    queryFn: () => ipc.invoke(IpcChannels.backup.preview),
    gcTime: 0,
  });
}

export function useCreateBackup() {
  return useMutation({
    mutationFn: (request: BackupCreateRequest) => ipc.invoke(IpcChannels.backup.create, request),
  });
}

export function useInspectBackup() {
  return useMutation({ mutationFn: () => ipc.invoke(IpcChannels.backup.inspect) });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: (request: BackupRestoreRequest) => ipc.invoke(IpcChannels.backup.restore, request),
  });
}

/** Cancela o backup ou a restauração em andamento (o zip parcial é apagado). */
export function cancelBackup() {
  return ipc.invoke(IpcChannels.backup.cancel);
}

/** Os prompts de IA: o padrão do app, as versões do usuário e qual está em uso. */
export function usePrompts() {
  return useQuery({
    queryKey: QueryKeys.prompts,
    queryFn: () => ipc.invoke(IpcChannels.prompts.list),
  });
}

/** Cada gravação devolve a visão completa já atualizada; ela substitui a que está na tela. */
function usePromptsMutation<Request>(
  send: (request: Request) => Promise<PromptsOverview>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    onSuccess: (overview) => queryClient.setQueryData(QueryKeys.prompts, overview),
  });
}

export const useSavePrompt = () =>
  usePromptsMutation((request: PromptSaveRequest) =>
    ipc.invoke(IpcChannels.prompts.save, request),
  );

export const useDeletePrompt = () =>
  usePromptsMutation((request: PromptDeleteRequest) =>
    ipc.invoke(IpcChannels.prompts.delete, request),
  );

export const useActivatePrompt = () =>
  usePromptsMutation((request: PromptActivateRequest) =>
    ipc.invoke(IpcChannels.prompts.activate, request),
  );
