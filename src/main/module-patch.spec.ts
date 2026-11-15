import { replaceModuleProvider, type MetadataAccess } from './module-patch';

function fakeMeta(initial: unknown[] | undefined): MetadataAccess & { stored: unknown } {
  const state = { stored: initial as unknown };

  return {
    get stored() {
      return state.stored;
    },
    get: () => state.stored,
    set: (_key, value) => {
      state.stored = value;
    },
  };
}

describe('replaceModuleProvider', () => {
  class A {}
  class B {}
  const replacement = { provide: B, useValue: 1 };

  it('when the provider is declared, should replace only that entry keeping order', () => {
    const meta = fakeMeta([A, B]);

    replaceModuleProvider(meta, {}, B, replacement);

    expect(meta.stored).toEqual([A, replacement]);
  });

  it('when the provider is not declared, should throw and keep the list', () => {
    const meta = fakeMeta([A]);

    expect(() => replaceModuleProvider(meta, {}, B, replacement)).toThrow(/não encontrado/);
    expect(meta.stored).toEqual([A]);
  });

  it('when the module has no providers metadata, should throw', () => {
    expect(() => replaceModuleProvider(fakeMeta(undefined), {}, B, replacement)).toThrow();
  });
});
