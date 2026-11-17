import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

import { makeTempDir, removeDir } from '../settings/settings.testing';

import { downloadInstaller, INSTALLER_ARGS, launchInstaller } from './windows-installer';

const body = Buffer.from('conteudo do instalador');
const sha256 = createHash('sha256').update(body).digest('hex');

const asset = (overrides: Record<string, unknown> = {}) => ({
  name: 'HomeLab-Setup-0.3.0.exe',
  url: 'https://github.com/owner/repo/releases/download/v0.3.0/HomeLab-Setup-0.3.0.exe',
  size: body.length,
  sha256,
  ...overrides,
});

describe('downloadInstaller', () => {
  let root: string;
  let dir: string;

  beforeEach(() => {
    root = makeTempDir();
    dir = path.join(root, 'updates');
  });

  afterEach(() => removeDir(root));

  it('when the checksum matches, should save the installer in the folder and report progress up to 100', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response(body));
    const progress: number[] = [];

    const file = await downloadInstaller({ fetchFn, dir }, asset(), (percent) =>
      progress.push(percent),
    );

    expect(file).toBe(path.join(dir, 'HomeLab-Setup-0.3.0.exe'));
    expect(fs.readFileSync(file)).toEqual(body);
    expect(progress.at(-1)).toBe(100);
  });

  it('when the checksum does not match, should reject and leave nothing behind', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response(body));

    await expect(
      downloadInstaller({ fetchFn, dir }, asset({ sha256: '0'.repeat(64) }), () => undefined),
    ).rejects.toThrow(/corrompido/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('when there are installers from earlier updates, should remove them first', async () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'HomeLab-Setup-0.1.0.exe'), 'velho');
    const fetchFn = jest.fn().mockResolvedValue(new Response(body));

    await downloadInstaller({ fetchFn, dir }, asset(), () => undefined);

    expect(fs.readdirSync(dir)).toEqual(['HomeLab-Setup-0.3.0.exe']);
  });

  it('when the asset name tries to leave the folder, should keep only the file name', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response(body));

    const file = await downloadInstaller(
      { fetchFn, dir },
      asset({ name: '../../evil.exe' }),
      () => undefined,
    );

    expect(file).toBe(path.join(dir, 'evil.exe'));
  });

  it('when the server answers an error, should reject with the download message', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response('x', { status: 404 }));

    await expect(downloadInstaller({ fetchFn, dir }, asset(), () => undefined)).rejects.toThrow(
      /404/,
    );
  });
});

describe('launchInstaller', () => {
  it('when launching, should start the installer silently with the update flags and then quit', () => {
    const order: string[] = [];
    const deps = {
      spawnDetached: jest.fn(() => order.push('spawn')),
      quit: jest.fn(() => order.push('quit')),
    };

    launchInstaller(deps, 'C:/u/updates/HomeLab-Setup-0.3.0.exe');

    expect(deps.spawnDetached).toHaveBeenCalledWith(
      'C:/u/updates/HomeLab-Setup-0.3.0.exe',
      INSTALLER_ARGS,
    );
    expect(INSTALLER_ARGS).toEqual(['/S', '--updated', '--force-run']);
    expect(order).toEqual(['spawn', 'quit']);
  });

  it('when the installer cannot start, should not quit the app', () => {
    const deps = {
      spawnDetached: jest.fn(() => {
        throw new Error('EACCES');
      }),
      quit: jest.fn(),
    };

    expect(() => launchInstaller(deps, 'x.exe')).toThrow('EACCES');
    expect(deps.quit).not.toHaveBeenCalled();
  });
});
