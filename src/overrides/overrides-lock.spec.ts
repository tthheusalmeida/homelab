import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  checkOverrides,
  describeProblems,
  hashContent,
  OVERRIDES_LOCK_FILE,
  refreshLock,
  type OverridesLock,
} from './overrides-lock';

const frontDir = path.resolve('/projects/front');
const file = 'src/components/AppSidebar.tsx';

const lockFor = (content: string): OverridesLock => ({
  [file]: { override: 'renderer/overrides/AppSidebar.tsx', sha256: hashContent(content) },
});

const reader = (content: string | null) => () => content;

describe('hashContent', () => {
  it('when the only difference is the line ending, should produce the same hash', () => {
    expect(hashContent('a\r\nb\r\n')).toBe(hashContent('a\nb\n'));
  });

  it('when the content changes, should produce a different hash', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('checkOverrides', () => {
  it('when the front file is unchanged, should be ok', () => {
    expect(checkOverrides(lockFor('x'), frontDir, reader('x'))).toEqual([
      { file, override: 'renderer/overrides/AppSidebar.tsx', status: 'ok' },
    ]);
  });

  it('when the front file changed, should report changed', () => {
    expect(checkOverrides(lockFor('x'), frontDir, reader('y'))[0].status).toBe('changed');
  });

  it('when the front file does not exist, should report missing', () => {
    expect(checkOverrides(lockFor('x'), frontDir, reader(null))[0].status).toBe('missing');
  });

  it('when reading, should look for the file inside the front folder', () => {
    const read = jest.fn().mockReturnValue('x');

    checkOverrides(lockFor('x'), frontDir, read);

    expect(read).toHaveBeenCalledWith(path.join(frontDir, file));
  });
});

describe('describeProblems', () => {
  it('when everything is ok, should list no problems', () => {
    expect(describeProblems(checkOverrides(lockFor('x'), frontDir, reader('x')))).toEqual([]);
  });

  it('when a front file changed, should tell how to reconcile and which command to run', () => {
    const [message] = describeProblems(checkOverrides(lockFor('x'), frontDir, reader('y')));

    expect(message).toContain(file);
    expect(message).toContain('renderer/overrides/AppSidebar.tsx');
    expect(message).toContain('npm run overrides:update');
  });

  it('when a front file is missing, should say it was not found', () => {
    const [message] = describeProblems(checkOverrides(lockFor('x'), frontDir, reader(null)));

    expect(message).toMatch(/não foi encontrado/);
  });
});

describe('refreshLock', () => {
  it('when refreshing, should record the current hash and keep the override path', () => {
    const refreshed = refreshLock(lockFor('x'), frontDir, reader('novo'));

    expect(refreshed[file]).toEqual({
      override: 'renderer/overrides/AppSidebar.tsx',
      sha256: hashContent('novo'),
    });
  });

  it('when a front file is missing, should throw instead of recording a hash', () => {
    expect(() => refreshLock(lockFor('x'), frontDir, reader(null))).toThrow(/não foi encontrado/);
  });
});

describe('desktop overrides vs the real front', () => {
  const desktopRoot = path.resolve(__dirname, '..', '..');
  const realFront = path.resolve(desktopRoot, '..', 'front');
  const lock = JSON.parse(
    fs.readFileSync(path.join(desktopRoot, OVERRIDES_LOCK_FILE), 'utf8'),
  ) as OverridesLock;

  it('when every override is listed, should have its copy in the desktop', () => {
    for (const { override } of Object.values(lock)) {
      expect(fs.existsSync(path.join(desktopRoot, override))).toBe(true);
    }
  });

  // Sem o repositório do front ao lado, não há o que comparar.
  (fs.existsSync(realFront) ? it : it.skip)(
    'when the front files are compared with the recorded hashes, should have no drift',
    () => {
      const read = (target: string) =>
        fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;

      expect(describeProblems(checkOverrides(lock, realFront, read))).toEqual([]);
    },
  );
});
