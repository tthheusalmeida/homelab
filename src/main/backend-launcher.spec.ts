import * as path from 'node:path';

import { BackendLauncher } from './backend-launcher';

function setup(entryExists: boolean) {
  const env: Record<string, string | undefined> = {};
  const chdir = jest.fn();
  const load = jest.fn();
  const launcher = new BackendLauncher({
    env,
    chdir,
    load,
    exists: () => entryExists,
  });

  return { env, chdir, load, launcher };
}

describe('BackendLauncher', () => {
  it('when the back build exists, should set CORS, enter the back folder and load dist/main.js', () => {
    const { env, chdir, load, launcher } = setup(true);

    launcher.start('/x/back', 'app://front');

    expect(env.CORS_ORIGIN).toBe('app://front');
    expect(chdir).toHaveBeenCalledWith('/x/back');
    expect(load).toHaveBeenCalledWith(path.join('/x/back', 'dist', 'main.js'));
  });

  it('when the back build is missing, should fail with a clear message and not load anything', () => {
    const { chdir, load, launcher } = setup(false);

    expect(() => launcher.start('/x/back', 'app://front')).toThrow(/npm run build:back/);
    expect(chdir).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });
});
