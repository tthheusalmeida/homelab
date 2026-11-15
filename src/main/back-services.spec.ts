import { BackServices, BackServiceSources } from './back-services';

/** Cada arquivo do back vira uma classe falsa própria, para saber o que foi pedido a quem. */
function setup() {
  const classes = new Map<string, object>();
  const module = jest.fn((file: string) => {
    const entry = Object.values(BackServiceSources)
      .flatMap((source) => [source.service, source.module])
      .find(([source]) => source === file);
    const name = entry?.[1] as string;
    const key = `${file}#${name}`;

    if (!classes.has(key)) {
      classes.set(key, class {});
    }

    return { [name]: classes.get(key) };
  });
  const instances = new Map<string, unknown>();
  const resolve = jest.fn((token: unknown, moduleClass: unknown) => {
    const key = `${[...classes].find(([, c]) => c === token)?.[0]}@${[...classes].find(([, c]) => c === moduleClass)?.[0]}`;

    return instances.get(key);
  });

  const keyFor = (source: { service: readonly string[]; module: readonly string[] }) =>
    `${source.service[0]}#${source.service[1]}@${source.module[0]}#${source.module[1]}`;

  return { module, resolve, instances, keyFor };
}

describe('BackServices', () => {
  it('when building the readers, should load each service and its module from back/dist', () => {
    const { module, resolve } = setup();

    new BackServices({ module } as never, resolve).readers();

    const expected = Object.values(BackServiceSources).flatMap((source) => [
      source.service[0],
      source.module[0],
    ]);
    expect(new Set(module.mock.calls.map(([file]) => file))).toEqual(new Set(expected));
  });

  it('when building the readers, should resolve every service inside its own module', () => {
    const { module, resolve } = setup();

    new BackServices({ module } as never, resolve).readers();

    expect(resolve).toHaveBeenCalledTimes(Object.keys(BackServiceSources).length);
    for (const [token, moduleClass] of resolve.mock.calls) {
      expect(typeof token).toBe('function');
      expect(typeof moduleClass).toBe('function');
      expect(token).not.toBe(moduleClass);
    }
  });

  it('when the container answers, should expose each instance in the matching reader', () => {
    const { module, resolve, instances, keyFor } = setup();
    const usage = { getUsage: jest.fn() };
    const chat = { chat: jest.fn() };
    instances.set(keyFor(BackServiceSources.aiUsage), usage);
    instances.set(keyFor(BackServiceSources.chat), chat);

    const readers = new BackServices({ module } as never, resolve).readers();

    expect(readers.aiUsage).toBe(usage);
    expect(readers.chat).toBe(chat);
  });

  it('when usage and the ai catalog are resolved, should use the AIModule (the one the chat uses)', () => {
    expect(BackServiceSources.aiUsage.module).toEqual(['modules/ai/ai.module', 'AIModule']);
    expect(BackServiceSources.ai.module).toEqual(['modules/ai/ai.module', 'AIModule']);
  });

  it('when the container fails to resolve a service, should propagate the error', () => {
    const { module } = setup();
    const resolve = jest.fn(() => {
      throw new Error('não encontrado');
    });

    expect(() => new BackServices({ module } as never, resolve).readers()).toThrow(
      'não encontrado',
    );
  });
});
