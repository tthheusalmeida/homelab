import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { LeftoverCleaner, type ActiveJobInfo } from './leftover-cleaner';

const key = (letter: string): string => letter.repeat(24);

describe('LeftoverCleaner', () => {
  let root: string;
  let pdfDir: string;
  let videoDir: string;
  let audioDir: string;
  let active: ActiveJobInfo[];

  const write = (file: string, content: string): void => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const cleaner = (withPdf = true): LeftoverCleaner =>
    new LeftoverCleaner({
      activeJobs: () => active,
      dirs: () => ({ pdfWorkDir: withPdf ? pdfDir : undefined, mediaDirs: [videoDir, audioDir] }),
    });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'leftovers-'));
    pdfDir = path.join(root, 'pdf');
    videoDir = path.join(root, 'video');
    audioDir = path.join(root, 'audio');
    active = [];
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('when nothing was left behind, should report zero and not fail on missing folders', async () => {
    await expect(cleaner().scan()).resolves.toEqual({ files: 0, bytes: 0 });
    await expect(cleaner().clean()).resolves.toEqual({ files: 0, bytes: 0, failed: 0 });
  });

  it('when progress folders of unfinished pdf jobs exist, should count their files and bytes', async () => {
    write(path.join(pdfDir, key('a'), 'manifest.json'), '12345');
    write(path.join(pdfDir, key('a'), 'part-0000.txt'), '123');
    write(path.join(pdfDir, key('b'), 'manifest.json'), '12');

    await expect(cleaner().scan()).resolves.toEqual({ files: 3, bytes: 10 });
  });

  it('when cleaning, should delete the progress folders and report what was freed', async () => {
    write(path.join(pdfDir, key('a'), 'manifest.json'), '12345');
    write(path.join(pdfDir, key('b'), 'summary-0000.md'), '12');

    await expect(cleaner().clean()).resolves.toEqual({ files: 2, bytes: 7, failed: 0 });
    expect(fs.existsSync(path.join(pdfDir, key('a')))).toBe(false);
    expect(fs.existsSync(path.join(pdfDir, key('b')))).toBe(false);
  });

  it('when a pdf job is running, should keep its progress folder', async () => {
    write(path.join(pdfDir, key('a'), 'manifest.json'), '1');
    write(path.join(pdfDir, key('b'), 'manifest.json'), '1');
    active = [{ id: 'j1', request: { checkpointKey: key('a') } }];

    await cleaner().clean();

    expect(fs.existsSync(path.join(pdfDir, key('a')))).toBe(true);
    expect(fs.existsSync(path.join(pdfDir, key('b')))).toBe(false);
  });

  it('when leftover video and audio files exist, should delete them', async () => {
    write(path.join(videoDir, 'old-job.mp4'), '1234');
    write(path.join(audioDir, 'old-job.wav'), '12');

    await expect(cleaner().clean()).resolves.toEqual({ files: 2, bytes: 6, failed: 0 });
    expect(fs.readdirSync(videoDir)).toEqual([]);
    expect(fs.readdirSync(audioDir)).toEqual([]);
  });

  it('when a video job is running, should keep the files with its id and delete the others', async () => {
    write(path.join(videoDir, 'job-live.mp4'), '1');
    write(path.join(audioDir, 'job-live.wav'), '1');
    write(path.join(videoDir, 'job-dead.mp4'), '1');
    active = [{ id: 'job-live' }];

    await cleaner().clean();

    expect(fs.readdirSync(videoDir)).toEqual(['job-live.mp4']);
    expect(fs.readdirSync(audioDir)).toEqual(['job-live.wav']);
  });

  it('when a folder inside the media folders exists, should delete it with everything in it', async () => {
    write(path.join(videoDir, 'sobras', 'a.part'), '123');

    await expect(cleaner().clean()).resolves.toEqual({ files: 1, bytes: 3, failed: 0 });
    expect(fs.readdirSync(videoDir)).toEqual([]);
  });

  it('when the pdf folder has names that are not progress keys, should leave them alone', async () => {
    write(path.join(pdfDir, 'minha-pasta', 'x.txt'), '1');
    write(path.join(pdfDir, 'notas.txt'), '1');

    await expect(cleaner().scan()).resolves.toEqual({ files: 0, bytes: 0 });
    await cleaner().clean();

    expect(fs.existsSync(path.join(pdfDir, 'minha-pasta', 'x.txt'))).toBe(true);
    expect(fs.existsSync(path.join(pdfDir, 'notas.txt'))).toBe(true);
  });

  it('when no pdf folder is configured, should only look at the media folders', async () => {
    write(path.join(pdfDir, key('a'), 'manifest.json'), '1');
    write(path.join(videoDir, 'x.mp4'), '1');

    await expect(cleaner(false).clean()).resolves.toMatchObject({ files: 1 });
    expect(fs.existsSync(path.join(pdfDir, key('a')))).toBe(true);
  });

  it('when only scanning, should delete nothing', async () => {
    write(path.join(pdfDir, key('a'), 'manifest.json'), '1');
    write(path.join(videoDir, 'x.mp4'), '1');

    await cleaner().scan();

    expect(fs.existsSync(path.join(pdfDir, key('a')))).toBe(true);
    expect(fs.existsSync(path.join(videoDir, 'x.mp4'))).toBe(true);
  });

  it('when one entry cannot be deleted, should keep going and count it as failed', async () => {
    write(path.join(videoDir, 'a.mp4'), '1');
    write(path.join(videoDir, 'b.mp4'), '1');
    const realRm = fs.promises.rm;
    const rm = jest.spyOn(fs.promises, 'rm').mockImplementation(async (target, options) => {
      if (String(target).endsWith('a.mp4')) {
        throw new Error('EBUSY');
      }

      return realRm(target, options);
    });

    await expect(cleaner().clean()).resolves.toEqual({ files: 1, bytes: 1, failed: 1 });

    rm.mockRestore();
    expect(fs.readdirSync(videoDir)).toEqual(['a.mp4']);
  });
});
