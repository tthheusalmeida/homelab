import { describe, expect, it, vi } from 'vitest';
import type { RouteObject } from 'react-router';

import { preloadRoutes, router } from './router';

/** Todas as rotas (inclusive as filhas) que carregam a tela sob demanda. */
function lazyRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.flatMap((route) => [
    ...(route.lazy ? [route] : []),
    ...lazyRoutes(route.children ?? []),
  ]);
}

describe('router', () => {
  it('when a route loads on demand, should resolve to a component (catches a wrong export name)', async () => {
    const routes = lazyRoutes(router.routes);

    expect(routes.length).toBeGreaterThanOrEqual(12);

    for (const route of routes) {
      const loaded = await (route.lazy as () => Promise<{ Component: unknown }>)();

      expect(typeof loaded.Component, String(route.path ?? 'index')).toBe('function');
    }
  }, 60_000);

  it('when the app opens, should keep the home screen out of the on-demand loading', () => {
    const home = router.routes[0].children?.find((route) => route.index);

    expect(home?.lazy).toBeUndefined();
    expect(home?.element).toBeDefined();
  });
});

describe('preloadRoutes', () => {
  function setup(count = 3) {
    const scheduled: Array<() => void> = [];
    const loaders = Array.from({ length: count }, () => vi.fn().mockResolvedValue({}));
    const cancel = vi.fn();
    const stop = preloadRoutes({
      load: loaders,
      schedule: (run) => scheduled.push(run),
      cancel,
    });

    /** Roda a etapa agendada e espera o carregamento terminar. */
    const step = async () => {
      scheduled.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    };

    return { loaders, scheduled, step, stop, cancel };
  }

  it('when started, should not load anything until the app is idle', () => {
    const { loaders, scheduled } = setup();

    expect(scheduled).toHaveLength(1);
    loaders.forEach((loader) => expect(loader).not.toHaveBeenCalled());
  });

  it('when idle time comes, should load one screen per step, in order', async () => {
    const { loaders, step } = setup();

    await step();
    expect(loaders.map((loader) => loader.mock.calls.length)).toEqual([1, 0, 0]);

    await step();
    expect(loaders.map((loader) => loader.mock.calls.length)).toEqual([1, 1, 0]);

    await step();
    expect(loaders.map((loader) => loader.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('when everything was loaded, should schedule nothing else', async () => {
    const { scheduled, step } = setup(1);

    await step();
    await step();

    expect(scheduled).toHaveLength(0);
  });

  it('when a screen fails to load, should go on with the next ones', async () => {
    const { loaders, step } = setup();

    loaders[0].mockRejectedValue(new Error('falhou'));

    await step();
    await step();

    expect(loaders[1]).toHaveBeenCalledTimes(1);
  });

  it('when stopped, should cancel the pending step and load nothing else', async () => {
    const { loaders, step, stop, cancel } = setup();

    stop();
    await step();

    expect(cancel).toHaveBeenCalledTimes(1);
    loaders.forEach((loader) => expect(loader).not.toHaveBeenCalled());
  });
});
