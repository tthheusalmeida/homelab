import { resolveFrontTarget } from './front-target';

describe('resolveFrontTarget', () => {
  it('when HOMELAB_FRONT_URL is set, should target the dev server and use its origin', () => {
    expect(
      resolveFrontTarget({ HOMELAB_FRONT_URL: 'http://localhost:5173/' }, 'app://front'),
    ).toEqual({
      kind: 'dev',
      url: 'http://localhost:5173/',
      origin: 'http://localhost:5173',
    });
  });

  it('when HOMELAB_FRONT_URL is not set, should target the built front through the app protocol', () => {
    expect(resolveFrontTarget({}, 'app://front')).toEqual({
      kind: 'build',
      url: 'app://front/',
      origin: 'app://front',
    });
  });

  it('when HOMELAB_FRONT_URL is blank, should target the built front', () => {
    expect(resolveFrontTarget({ HOMELAB_FRONT_URL: '   ' }, 'app://front').kind).toBe('build');
  });
});
