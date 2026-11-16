import { COMPONENT_CATALOG, findComponent, modelSpecs } from './component-manifest';

describe('COMPONENT_CATALOG', () => {
  it('when listing the components, should have unique ids', () => {
    const ids = COMPONENT_CATALOG.map((spec) => spec.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('when a component is downloadable, should have an https url and a sha256', () => {
    for (const spec of COMPONENT_CATALOG.filter((item) => item.kind !== 'bundled')) {
      expect(spec.download?.url).toMatch(/^https:\/\//);
      expect(spec.download?.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(spec.sizeBytes).toBeGreaterThan(0);
    }
  });

  it('when a component is bundled, should be required and have nothing to download', () => {
    for (const spec of COMPONENT_CATALOG.filter((item) => item.kind === 'bundled')) {
      expect(spec.required).toBe(true);
      expect(spec.download).toBeUndefined();
    }
  });

  it('when looking up an id, should find it or return undefined', () => {
    expect(findComponent('cuda-pack')?.kind).toBe('zip');
    expect(findComponent('nao-existe')).toBeUndefined();
  });

  it('when listing models, should only return the model group', () => {
    expect(modelSpecs().every((spec) => spec.group === 'model')).toBe(true);
    expect(modelSpecs().length).toBeGreaterThan(1);
  });
});
