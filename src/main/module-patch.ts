/** Chave dos metadados de um módulo Nest com a lista de providers. */
export const PROVIDERS_METADATA_KEY = 'providers';

export const ModulePatchMessages = {
  providerNotFound: 'Provider a substituir não encontrado no módulo.',
} as const;

export interface MetadataAccess {
  get(key: string, target: object): unknown;
  set(key: string, value: unknown, target: object): void;
}

/**
 * Troca um provider declarado por um módulo do back **antes** de o Nest subir,
 * sem editar o back. É o ponto de extensão usado para o `GeminiProvider`.
 */
export function replaceModuleProvider(
  meta: MetadataAccess,
  moduleClass: object,
  token: unknown,
  replacement: unknown,
): void {
  const providers = (meta.get(PROVIDERS_METADATA_KEY, moduleClass) as unknown[] | undefined) ?? [];

  if (!providers.includes(token)) {
    throw new Error(ModulePatchMessages.providerNotFound);
  }

  meta.set(
    PROVIDERS_METADATA_KEY,
    providers.map((provider) => (provider === token ? replacement : provider)),
    moduleClass,
  );
}
