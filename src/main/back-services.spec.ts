import { BackServices, BackServiceSources } from './back-services';

class FakeToken {}

function setup() {
  const instances = new Map<unknown, unknown>();
  const module = jest.fn((file: string) => {
    const [, name] = Object.values(BackServiceSources).find(([source]) => source === file) ?? [];

    return { [name as string]: FakeToken };
  });
  const resolve = jest.fn((token: unknown) => instances.get(token));

  return { module, resolve, instances };
}

describe('BackServices', () => {
  it('when building the readers, should load each service class from its back module', () => {
    const { module, resolve } = setup();

    new BackServices({ module } as never, resolve).readers();

    expect(module.mock.calls.map(([file]) => file).sort()).toEqual(
      Object.values(BackServiceSources)
        .map(([file]) => file)
        .sort(),
    );
  });

  it('when building the readers, should resolve every class from the container', () => {
    const { module, resolve } = setup();

    new BackServices({ module } as never, resolve).readers();

    expect(resolve).toHaveBeenCalledTimes(4);
    expect(resolve).toHaveBeenCalledWith(FakeToken);
  });

  it('when the container answers, should expose that instance in the matching reader', () => {
    const { module, resolve, instances } = setup();
    const instance = { check: jest.fn() };
    instances.set(FakeToken, instance);

    const readers = new BackServices({ module } as never, resolve).readers();

    expect(readers.healthSystem).toBe(instance);
    expect(readers.aiUsage).toBe(instance);
  });

  it('when the container fails to resolve a class, should propagate the error', () => {
    const { module } = setup();
    const resolve = jest.fn(() => {
      throw new Error('não encontrado');
    });

    expect(() => new BackServices({ module } as never, resolve).readers()).toThrow(
      'não encontrado',
    );
  });
});
