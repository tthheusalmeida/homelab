import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { seedBinDir } from './bin-seed';

describe('seedBinDir', () => {
  let root: string;
  let source: string;
  let target: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-'));
    source = path.join(root, 'install');
    target = path.join(root, 'user');
    fs.mkdirSync(source);
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('when the target is empty, should copy every bundled file', async () => {
    fs.writeFileSync(path.join(source, 'ffmpeg.exe'), 'abc');

    const result = await seedBinDir(source, target);

    expect(result).toEqual({ copied: 1, kept: 0 });
    expect(fs.readFileSync(path.join(target, 'ffmpeg.exe'), 'utf8')).toBe('abc');
  });

  it('when a file already exists with the same size, should not touch it', async () => {
    fs.writeFileSync(path.join(source, 'whisper.dll'), 'new');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'whisper.dll'), 'old');

    const result = await seedBinDir(source, target);

    expect(result).toEqual({ copied: 0, kept: 1 });
    expect(fs.readFileSync(path.join(target, 'whisper.dll'), 'utf8')).toBe('old');
  });

  it('when a bundled file changed size, should replace it', async () => {
    fs.writeFileSync(path.join(source, 'yt-dlp.exe'), 'newer-version');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'yt-dlp.exe'), 'old');

    const result = await seedBinDir(source, target);

    expect(result.copied).toBe(1);
    expect(fs.readFileSync(path.join(target, 'yt-dlp.exe'), 'utf8')).toBe('newer-version');
  });

  it('when the target has files that are not bundled (CUDA pack), should keep them', async () => {
    fs.writeFileSync(path.join(source, 'ffmpeg.exe'), 'abc');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'cudart64_12.dll'), 'cuda');

    await seedBinDir(source, target);

    expect(fs.readFileSync(path.join(target, 'cudart64_12.dll'), 'utf8')).toBe('cuda');
  });

  it('when the source folder does not exist, should do nothing and not create the target', async () => {
    const result = await seedBinDir(path.join(root, 'missing'), target);

    expect(result).toEqual({ copied: 0, kept: 0 });
    expect(fs.existsSync(target)).toBe(false);
  });

  it('when copying, should leave no partial file behind', async () => {
    fs.writeFileSync(path.join(source, 'a.dll'), 'x');

    await seedBinDir(source, target);

    expect(fs.readdirSync(target)).toEqual(['a.dll']);
  });
});
