import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { AccessRequiredError } from './access-required.error';
import {
  isAccessFailure,
  lastErrorLine,
  PlatformDownloader,
  PlatformMessages,
  type CookieFile,
  type RunProgram,
} from './platform-downloader';

const YT_DLP = 'C:\\bin\\yt-dlp.exe';
/** Caminho absoluto no sistema onde o teste roda (`C:\\...` não é absoluto no Linux). */
const FFMPEG = path.resolve('/bin/ffmpeg');
const URL_ = 'https://www.youtube.com/watch?v=abc';

function failure(stderr: string) {
  return Object.assign(new Error('Command failed'), { stderr });
}

function build(
  run: RunProgram,
  overrides: { cookies?: CookieFile | null; installed?: boolean } = {},
) {
  const cookiesFor = jest.fn().mockResolvedValue(overrides.cookies ?? null);

  const downloader = new PlatformDownloader({
    run,
    ffmpegPath: FFMPEG,
    tools: {
      ytDlpPath: () => (overrides.installed === false ? null : YT_DLP),
      cookiesFor,
    },
  });

  return { downloader, cookiesFor };
}

describe('isAccessFailure', () => {
  it.each([
    'ERROR: [youtube] abc: Sign in to confirm you’re not a bot',
    "ERROR: Private video. Sign in if you've been granted access",
    'ERROR: unable to download: HTTP Error 403: Forbidden',
    'ERROR: This video is available to members-only',
    'ERROR: Use --cookies-from-browser or --cookies for the authentication',
  ])('when the message is "%s", should need access', (message) => {
    expect(isAccessFailure(message)).toBe(true);
  });

  it('when the page redirected to a login screen the extractor does not support, should need access', () => {
    expect(
      isAccessFailure(
        'ERROR: [generic] Unsupported URL: https://iad.login.instructure.com/discovery/344ad656',
      ),
    ).toBe(true);
  });

  it('when an unsupported URL is not a login page, should not need access', () => {
    expect(isAccessFailure('ERROR: Unsupported URL: https://example.com/pagina/aula-1')).toBe(
      false,
    );
  });

  it('when the message is a plain network error, should not need access', () => {
    expect(isAccessFailure('ERROR: Unable to connect: getaddrinfo ENOTFOUND')).toBe(false);
  });
});

describe('lastErrorLine', () => {
  it('when stderr has several lines, should return the last error without prefixes', () => {
    const stderr = 'WARNING: x\nERROR: [generic] Unsupported URL: https://a.com\n';

    expect(lastErrorLine(stderr)).toBe('Unsupported URL: https://a.com');
  });

  it('when stderr has no error line, should return empty text', () => {
    expect(lastErrorLine('nada aqui')).toBe('');
  });
});

describe('PlatformDownloader', () => {
  it('when yt-dlp is not installed, should ask to install the component', async () => {
    const run = jest.fn();
    const { downloader } = build(run, { installed: false });

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).rejects.toThrow(
      PlatformMessages.notInstalled,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('when the download works, should return the file path printed by yt-dlp', async () => {
    const run = jest.fn().mockResolvedValue({ stdout: 'C:\\tmp\\job1.webm\n', stderr: '' });
    const { downloader } = build(run);

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).resolves.toBe(
      path.resolve('C:\\tmp\\job1.webm'),
    );
  });

  it('when downloading, should ask only for the audio, in the job folder, with the bundled ffmpeg', async () => {
    const run = jest.fn().mockResolvedValue({ stdout: 'C:\\tmp\\job1.m4a', stderr: '' });
    const { downloader } = build(run);

    await downloader.download(URL_, 'job1', 'C:\\tmp');

    const args = run.mock.calls[0][1] as string[];

    expect(run.mock.calls[0][0]).toBe(YT_DLP);
    expect(args).toEqual(expect.arrayContaining(['-f', 'bestaudio/best', '--no-playlist']));
    expect(args).toEqual(expect.arrayContaining(['-P', 'C:\\tmp', '-o', 'job1.%(ext)s']));
    expect(args).toEqual(expect.arrayContaining(['--ffmpeg-location', FFMPEG]));
    expect(args.at(-1)).toBe(URL_);
  });

  it('when the system ffmpeg from PATH is used, should not pass the ffmpeg location', async () => {
    const run = jest.fn().mockResolvedValue({ stdout: 'C:\\tmp\\job1.m4a', stderr: '' });
    const downloader = new PlatformDownloader({
      run,
      ffmpegPath: 'ffmpeg',
      tools: { ytDlpPath: () => YT_DLP, cookiesFor: async () => null },
    });

    await downloader.download(URL_, 'job1', 'C:\\tmp');

    expect(run.mock.calls[0][1]).not.toContain('--ffmpeg-location');
  });

  it('when there are cookies for the site, should pass them and delete the file afterwards', async () => {
    const cleanup = jest.fn().mockResolvedValue(undefined);
    const run = jest.fn().mockResolvedValue({ stdout: 'C:\\tmp\\job1.m4a', stderr: '' });
    const { downloader } = build(run, { cookies: { file: 'C:\\tmp\\cookies.txt', cleanup } });

    await downloader.download(URL_, 'job1', 'C:\\tmp');

    expect(run.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--cookies', 'C:\\tmp\\cookies.txt']),
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('when the download fails, should still delete the cookies file', async () => {
    const cleanup = jest.fn().mockResolvedValue(undefined);
    const run = jest.fn().mockRejectedValue(failure('ERROR: Private video'));
    const { downloader } = build(run, { cookies: { file: 'c.txt', cleanup } });

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).rejects.toBeInstanceOf(
      AccessRequiredError,
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('when the site asks for login and there is a main browser, should retry with its cookies', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(failure('ERROR: Unsupported URL: https://x.login.instructure.com/a'))
      .mockResolvedValueOnce({ stdout: 'C:\\tmp\\job1.m4a', stderr: '' });
    const downloader = new PlatformDownloader({
      run,
      tools: {
        ytDlpPath: () => YT_DLP,
        cookiesFor: async () => null,
        browser: async () => 'chrome',
      },
    });

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).resolves.toBe(
      path.resolve('C:\\tmp\\job1.m4a'),
    );
    expect(run.mock.calls[0][1]).not.toContain('--cookies-from-browser');
    expect(run.mock.calls[1][1]).toEqual(
      expect.arrayContaining(['--cookies-from-browser', 'chrome']),
    );
  });

  it('when the browser cookies do not help or cannot be read, should ask the user to sign in', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(failure('ERROR: Private video'))
      .mockRejectedValueOnce(failure('ERROR: Could not copy Chrome cookie database'));
    const downloader = new PlatformDownloader({
      run,
      tools: {
        ytDlpPath: () => YT_DLP,
        cookiesFor: async () => null,
        browser: async () => 'chrome',
      },
    });

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).rejects.toBeInstanceOf(
      AccessRequiredError,
    );
    expect(run).toHaveBeenCalledTimes(2);
  });

  describe('when yt-dlp does not recognise the page', () => {
    const PAGE = 'https://curso.edu/courses/1/pages/aula';
    const unsupported = failure(`ERROR: [generic] Unsupported URL: ${PAGE}`);

    function withMedia(run: RunProgram, scan: { urls: string[]; loginRequired: boolean }) {
      const findMedia = jest.fn().mockResolvedValue(scan);
      const downloader = new PlatformDownloader({
        run,
        tools: { ytDlpPath: () => YT_DLP, cookiesFor: async () => null, findMedia },
      });

      return { downloader, findMedia };
    }

    it('should download the video found in the page, using the page as referer', async () => {
      const run = jest
        .fn()
        .mockRejectedValueOnce(unsupported)
        .mockResolvedValueOnce({ stdout: 'C:\tmp\\job1.mp4', stderr: '' });
      const { downloader, findMedia } = withMedia(run, {
        urls: ['https://cdn.curso.edu/aula.mp4'],
        loginRequired: false,
      });

      await expect(downloader.download(PAGE, 'job1', 'C:\tmp')).resolves.toBe(
        path.resolve('C:\tmp\\job1.mp4'),
      );
      expect(findMedia).toHaveBeenCalledWith(PAGE);

      const args = run.mock.calls[1][1] as string[];

      expect(args.at(-1)).toBe('https://cdn.curso.edu/aula.mp4');
      expect(args).toEqual(expect.arrayContaining(['--referer', PAGE]));
    });

    it('when the first candidate fails, should try the next one', async () => {
      const run = jest
        .fn()
        .mockRejectedValueOnce(unsupported)
        .mockRejectedValueOnce(failure('ERROR: Unsupported URL: https://a.com/embed'))
        .mockResolvedValueOnce({ stdout: 'C:\tmp\\job1.mp4', stderr: '' });
      const { downloader } = withMedia(run, {
        urls: ['https://a.com/embed', 'https://b.com/v.mp4'],
        loginRequired: false,
      });

      await downloader.download(PAGE, 'job1', 'C:\tmp');

      expect(run).toHaveBeenCalledTimes(3);
    });

    it('when the page sent us to a login screen, should ask the user to sign in', async () => {
      const run = jest.fn().mockRejectedValue(unsupported);
      const { downloader } = withMedia(run, { urls: [], loginRequired: true });

      await expect(downloader.download(PAGE, 'job1', 'C:\tmp')).rejects.toBeInstanceOf(
        AccessRequiredError,
      );
    });

    it('when the page has no video, should say so', async () => {
      const run = jest.fn().mockRejectedValue(unsupported);
      const { downloader } = withMedia(run, { urls: [], loginRequired: false });

      await expect(downloader.download(PAGE, 'job1', 'C:\tmp')).rejects.toThrow(
        PlatformMessages.noVideoInPage,
      );
    });
  });

  it('when the site asks for login, should throw AccessRequiredError with the link', async () => {
    const run = jest.fn().mockRejectedValue(failure('ERROR: [x] Sign in to confirm'));
    const { downloader } = build(run);

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).rejects.toMatchObject({
      code: 'ACCESS_REQUIRED',
      url: URL_,
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('when it fails for another reason, should update yt-dlp once and try again', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(failure('ERROR: Unable to extract video data'))
      .mockResolvedValueOnce({ stdout: 'updated', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'C:\\tmp\\job1.webm', stderr: '' });
    const { downloader } = build(run);

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).resolves.toBe(
      path.resolve('C:\\tmp\\job1.webm'),
    );
    expect(run.mock.calls[1][1]).toEqual(['-U']);
  });

  it('when it fails again after updating, should report a friendly error with the reason', async () => {
    const run = jest.fn().mockImplementation(async (_file: string, args: string[]) => {
      if (args[0] === '-U') {
        return { stdout: '', stderr: '' };
      }

      throw failure('ERROR: [generic] Unsupported URL: https://a.com');
    });
    const { downloader } = build(run);

    await expect(downloader.download('https://a.com', 'job1', 'C:\\tmp')).rejects.toThrow(
      'Não foi possível baixar o vídeo desta plataforma. Unsupported URL: https://a.com',
    );
    expect(run.mock.calls.filter(([, args]) => args[0] === '-U')).toHaveLength(1);
  });

  it('when updating is not possible, should not loop and should report the failure', async () => {
    const run = jest.fn().mockRejectedValue(failure('ERROR: algo quebrou'));
    const { downloader } = build(run);

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).rejects.toThrow(
      'Não foi possível baixar o vídeo desta plataforma. algo quebrou',
    );
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('when yt-dlp prints no file path, should report that the file was not found', async () => {
    const run = jest.fn().mockResolvedValue({ stdout: '\n', stderr: '' });
    const { downloader } = build(run);

    await expect(downloader.download(URL_, 'job1', 'C:\\tmp')).rejects.toThrow(
      PlatformMessages.noFile,
    );
  });
});

describe('PlatformDownloader: andamento do download', () => {
  it('when someone follows the download, should ask yt-dlp for progress lines and report the percent', async () => {
    const run = jest.fn(async (_file: string, args: string[], onText?: (text: string) => void) => {
      onText?.('HLPROG  10.0%\n');
      onText?.('HLPROG  55.5%\n');
      onText?.('HLPROG 100.0%\n');

      expect(args).toContain('--newline');
      expect(args).not.toContain('--no-progress');

      return { stdout: 'HLPROG 100.0%\n/tmp/dl/v.m4a\n', stderr: '' };
    });
    const { downloader } = build(run);
    const seen: number[] = [];

    const file = await downloader.download(URL_, 'job', '/tmp/dl', (percent) => seen.push(percent));

    expect(seen).toEqual([10, 55, 100]);
    expect(file).toBe(path.resolve('/tmp/dl/v.m4a'));
  });

  it('when nobody follows the download, should keep the quiet arguments and not stream', async () => {
    const run = jest.fn(async (_file: string, args: string[]) => {
      expect(args).toContain('--no-progress');

      return { stdout: '/tmp/dl/v.m4a\n', stderr: '' };
    });
    const { downloader } = build(run);

    await downloader.download(URL_, 'job', '/tmp/dl');

    expect(run.mock.calls[0]).toHaveLength(2);
  });

  it('when the download ends, should stop reporting to the previous listener', async () => {
    const run = jest.fn(async () => ({ stdout: '/tmp/dl/v.m4a\n', stderr: '' }));
    const { downloader } = build(run);

    await downloader.download(URL_, 'job', '/tmp/dl', () => undefined);
    await downloader.download(URL_, 'job2', '/tmp/dl');

    expect(run.mock.calls[1]).toHaveLength(2);
  });
});

describe('PlatformDownloader: cancelamento', () => {
  const abort = () => Object.assign(new Error('Operação cancelada.'), { name: 'AbortError' });

  it('when cancelled, should pass the signal to the program and not retry, update or ask for login', async () => {
    const controller = new AbortController();
    const run = jest.fn(async () => {
      throw abort();
    });
    const { downloader } = build(run as unknown as RunProgram);

    await expect(
      downloader.download(URL_, 'job', os.tmpdir(), undefined, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0] as unknown[]).toEqual([
      YT_DLP,
      expect.any(Array),
      undefined,
      controller.signal,
    ]);
  });

  it('when cancelled, should remove the partial files of that download and keep the other files', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-cancel-'));

    try {
      fs.writeFileSync(path.join(dir, 'job.webm.part'), 'x');
      fs.writeFileSync(path.join(dir, 'job.f251.webm.ytdl'), 'x');
      fs.writeFileSync(path.join(dir, 'outro.webm.part'), 'x');
      fs.writeFileSync(path.join(dir, 'job.m4a'), 'x');

      const run = jest.fn(async () => {
        throw abort();
      });
      const { downloader } = build(run as unknown as RunProgram);

      await expect(
        downloader.download(URL_, 'job', dir, undefined, new AbortController().signal),
      ).rejects.toMatchObject({ name: 'AbortError' });

      expect(fs.readdirSync(dir).sort()).toEqual(['job.m4a', 'outro.webm.part']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('when cancelled, should still clean up the temporary cookies', async () => {
    const cleanup = jest.fn().mockResolvedValue(undefined);
    const run = jest.fn(async () => {
      throw abort();
    });
    const { downloader } = build(run as unknown as RunProgram, {
      cookies: { file: 'c.txt', cleanup },
    });

    await expect(
      downloader.download(URL_, 'job', os.tmpdir(), undefined, new AbortController().signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(cleanup).toHaveBeenCalled();
  });
});
