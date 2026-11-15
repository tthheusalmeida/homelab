import * as path from 'node:path';

import {
  resolveBackDir,
  resolveBackEntry,
  resolveBinDir,
  resolveFrontDist,
  resolveLegacyEnvFile,
} from './paths';

const root = path.resolve('/projects/desktop');

describe('resolveBackDir', () => {
  it('when HOMELAB_BACK_DIR is not set, should use ../back next to the project', () => {
    expect(resolveBackDir(root, {})).toBe(path.resolve(root, '..', 'back'));
  });

  it('when HOMELAB_BACK_DIR is set, should use it', () => {
    expect(resolveBackDir(root, { HOMELAB_BACK_DIR: '/x/back' })).toBe('/x/back');
  });
});

describe('resolveBackEntry', () => {
  it('when called, should point to dist/main.js inside the back folder', () => {
    expect(resolveBackEntry('/x/back')).toBe(path.join('/x/back', 'dist', 'main.js'));
  });
});

describe('resolveFrontDist', () => {
  it('when HOMELAB_FRONT_DIST_DIR is not set, should use ../front/dist', () => {
    expect(resolveFrontDist(root, {})).toBe(path.resolve(root, '..', 'front', 'dist'));
  });

  it('when HOMELAB_FRONT_DIST_DIR is set, should use it', () => {
    expect(resolveFrontDist(root, { HOMELAB_FRONT_DIST_DIR: '/x/dist' })).toBe('/x/dist');
  });
});

describe('resolveLegacyEnvFile', () => {
  it('when called, should point to .env inside the back folder', () => {
    expect(resolveLegacyEnvFile('/x/back')).toBe(path.join('/x/back', '.env'));
  });
});

describe('resolveBinDir', () => {
  it('when called, should point to resources/bin/<platform>-<arch>', () => {
    expect(resolveBinDir(root, 'win32', 'x64')).toBe(
      path.join(root, 'resources', 'bin', 'win32-x64'),
    );
  });
});
