import * as path from 'node:path';

import { resolveBinDir, resolveFrontDist, resolveResourcesDir } from './paths';

const root = path.resolve('/projects/desktop');

describe('resolveFrontDist', () => {
  it('when HOMELAB_FRONT_DIST_DIR is not set, should use dist-renderer inside the project', () => {
    expect(resolveFrontDist(root, {})).toBe(path.join(root, 'dist-renderer'));
  });

  it('when HOMELAB_FRONT_DIST_DIR is set, should use it', () => {
    expect(resolveFrontDist(root, { HOMELAB_FRONT_DIST_DIR: '/x/dist' })).toBe('/x/dist');
  });
});

describe('resolveBinDir', () => {
  it('when called, should point to resources/bin/<platform>-<arch>', () => {
    expect(resolveBinDir(path.join(root, 'resources'), 'win32', 'x64')).toBe(
      path.join(root, 'resources', 'bin', 'win32-x64'),
    );
  });
});

describe('resolveResourcesDir', () => {
  it('when running in development, should use the resources folder of the project', () => {
    expect(resolveResourcesDir(root, false, '/app/resources')).toBe(path.join(root, 'resources'));
  });

  it('when running packaged, should use the resources path next to the executable', () => {
    expect(resolveResourcesDir(root, true, '/app/resources')).toBe('/app/resources');
  });
});

describe('resolveBinDir packaged', () => {
  it('when given the packaged resources path, should point to <resources>/bin/<platform>-<arch>', () => {
    const resources = path.resolve('/app/resources');

    expect(resolveBinDir(resources, 'win32', 'x64')).toBe(path.join(resources, 'bin', 'win32-x64'));
  });
});
