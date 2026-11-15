import { resolveFrontTarget } from './front-target';

describe('resolveFrontTarget', () => {
  it('when HOMELAB_FRONT_URL is set, should target the dev server and use its origin', () => {
    expect(
      resolveFrontTarget({ HOMELAB_FRONT_URL: 'http://localhost:5173/' }, 'app://front'),
    ).toEqual({
      kind: 'dev',
      url: 'http://localhost:5173/',
      origin: 'http://localhost:5173',
      settingsUrl: 'http://localhost:5174',
      settingsOrigin: 'http://localhost:5174',
    });
  });

  it('when HOMELAB_SETTINGS_URL is set in dev, should use it for the settings window', () => {
    const target = resolveFrontTarget(
      {
        HOMELAB_FRONT_URL: 'http://localhost:5173/',
        HOMELAB_SETTINGS_URL: 'http://localhost:6000/x',
      },
      'app://front',
    );

    expect(target.settingsUrl).toBe('http://localhost:6000/x');
    expect(target.settingsOrigin).toBe('http://localhost:6000');
  });

  it('when HOMELAB_FRONT_URL is not set, should target the built front through the app protocol', () => {
    expect(resolveFrontTarget({}, 'app://front')).toEqual({
      kind: 'build',
      url: 'app://front/',
      origin: 'app://front',
      settingsUrl: 'app://front/settings/index.html',
      settingsOrigin: 'app://front',
    });
  });

  it('when HOMELAB_FRONT_URL is blank, should target the built front', () => {
    expect(resolveFrontTarget({ HOMELAB_FRONT_URL: '   ' }, 'app://front').kind).toBe('build');
  });
});
