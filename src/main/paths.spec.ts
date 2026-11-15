import * as path from 'node:path';

import { resolveBinDir, resolveFrontDist } from './paths';

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
    expect(resolveBinDir(root, 'win32', 'x64')).toBe(
      path.join(root, 'resources', 'bin', 'win32-x64'),
    );
  });
});
