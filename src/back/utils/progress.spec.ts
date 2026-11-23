import {
  ffmpegPercentTracker,
  onlyChanges,
  parseFfmpegDuration,
  parseFfmpegTime,
  parseWhisperPercent,
  parseYtDlpPercent,
} from './progress';

describe('parseWhisperPercent', () => {
  it('when the text has several progress lines, should return the last one', () => {
    const text = 'whisper_print_progress_callback: progress =   5%\nprogress =  35%\n';

    expect(parseWhisperPercent(text)).toBe(35);
  });

  it('when the text has no progress, should return null', () => {
    expect(parseWhisperPercent('carregando modelo')).toBeNull();
  });

  it('when the value is above 100, should cap it at 100', () => {
    expect(parseWhisperPercent('progress = 150%')).toBe(100);
  });
});

describe('parseYtDlpPercent', () => {
  it('when the line has a decimal percent, should round it down', () => {
    expect(parseYtDlpPercent('HLPROG 42.9%\n')).toBe(42);
  });

  it('when the percent has leading spaces, should still read it', () => {
    expect(parseYtDlpPercent('HLPROG   7.0%')).toBe(7);
  });

  it('when other lines have percents, should ignore them', () => {
    expect(parseYtDlpPercent('[download] 90% of 3MiB')).toBeNull();
  });
});

describe('ffmpeg', () => {
  it('when the header has a duration, should read it in seconds', () => {
    expect(parseFfmpegDuration('  Duration: 00:10:00.50, start: 0')).toBe(600.5);
  });

  it('when the line has the current time, should read the last one', () => {
    expect(parseFfmpegTime('time=00:00:10.00 x\rtime=00:01:05.50 y')).toBe(65.5);
  });

  it('when duration and time arrive in different chunks, should compute the percent', () => {
    const seen: number[] = [];
    const track = ffmpegPercentTracker((percent) => seen.push(percent));

    track('Duration: 00:10:00.00, start');
    track('size=1kB time=00:03:00.00 bitrate');
    track('size=2kB time=00:09:00.00 bitrate');

    expect(seen).toEqual([30, 90]);
  });

  it('when the duration is unknown, should not report anything', () => {
    const seen: number[] = [];

    ffmpegPercentTracker((percent) => seen.push(percent))('time=00:00:10.00');

    expect(seen).toEqual([]);
  });
});

describe('onlyChanges', () => {
  it('when the same percent repeats, should notify only once', () => {
    const listener = jest.fn();
    const filtered = onlyChanges(listener);

    [10, 10, 11, 11, 10].forEach(filtered);

    expect(listener.mock.calls.map(([value]) => value)).toEqual([10, 11, 10]);
  });
});
