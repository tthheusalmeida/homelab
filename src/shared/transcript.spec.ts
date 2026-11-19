import {
  buildVideoLink,
  formatClock,
  formatTimestamp,
  parseTimedTranscript,
  supportsTimedLink,
  TIMESTAMP_PREFIX,
} from './transcript';

describe('formatTimestamp', () => {
  it.each([
    [0, '[00:00:00]'],
    [999, '[00:00:00]'],
    [65_000, '[00:01:05]'],
    [3_723_000, '[01:02:03]'],
    [100 * 3600 * 1000, '[100:00:00]'],
  ])('when the start is %i ms, should format it as %s', (ms, expected) => {
    expect(formatTimestamp(ms)).toBe(expected);
  });

  it('when the start is negative, should clamp to zero', () => {
    expect(formatTimestamp(-5)).toBe('[00:00:00]');
  });

  it('when a stamp is formatted, should be read back by the prefix pattern', () => {
    expect(TIMESTAMP_PREFIX.test(`${formatTimestamp(3_723_000)} texto`)).toBe(true);
  });
});

describe('parseTimedTranscript', () => {
  it('when every block starts with the time, should return the excerpts with seconds and text', () => {
    const body = '[00:00:00] Olá.\n\n[00:01:05] Segundo trecho\ncom quebra.\n\n[01:00:00] Fim.';

    expect(parseTimedTranscript(body)).toEqual([
      { seconds: 0, text: 'Olá.' },
      { seconds: 65, text: 'Segundo trecho com quebra.' },
      { seconds: 3600, text: 'Fim.' },
    ]);
  });

  it('when the lines use CRLF, should still split the blocks', () => {
    expect(parseTimedTranscript('[00:00:01] A.\r\n\r\n[00:00:09] B.')).toHaveLength(2);
  });

  it('when a block has no time, should return null so the text is shown as is', () => {
    expect(parseTimedTranscript('[00:00:00] Olá.\n\nSem tempo.')).toBeNull();
  });

  it('when the document is an old plain transcript, should return null', () => {
    expect(parseTimedTranscript('Texto corrido de uma transcrição antiga.')).toBeNull();
  });

  it('when a block has the time but no text, should return null', () => {
    expect(parseTimedTranscript('[00:00:00] ')).toBeNull();
  });

  it('when the body is empty, should return null', () => {
    expect(parseTimedTranscript('  \n\n ')).toBeNull();
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [65, '1:05'],
    [3600, '1:00:00'],
    [3723, '1:02:03'],
    [-3, '0:00'],
  ])('when the seconds are %i, should show %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe('buildVideoLink', () => {
  it('when the link is a YouTube watch page, should set t in seconds keeping the video', () => {
    expect(buildVideoLink('https://www.youtube.com/watch?v=abc123', 192)).toBe(
      'https://www.youtube.com/watch?v=abc123&t=192s',
    );
  });

  it('when the YouTube link already has a time, should replace it', () => {
    const link = buildVideoLink('https://www.youtube.com/watch?v=abc&t=10s&start=5', 60);

    expect(link).toBe('https://www.youtube.com/watch?v=abc&t=60s');
  });

  it('when the link is a short youtu.be, should set t', () => {
    expect(buildVideoLink('https://youtu.be/abc123', 75)).toBe('https://youtu.be/abc123?t=75s');
  });

  it('when the link is Vimeo, should use the hash time', () => {
    expect(buildVideoLink('https://vimeo.com/12345', 90)).toBe('https://vimeo.com/12345#t=90s');
  });

  it('when the link is a direct media file, should use the media fragment', () => {
    expect(buildVideoLink('https://x.test/aula.mp4', 30)).toBe('https://x.test/aula.mp4#t=30');
  });

  it('when the platform has no timed link, should open just the video', () => {
    expect(buildVideoLink('https://outro.test/video/9', 30)).toBe('https://outro.test/video/9');
  });

  it('when the seconds have decimals or are negative, should floor and clamp them', () => {
    expect(buildVideoLink('https://youtu.be/a', 12.9)).toBe('https://youtu.be/a?t=12s');
    expect(buildVideoLink('https://youtu.be/a', -4)).toBe('https://youtu.be/a?t=0s');
  });

  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'nao e link', ''])(
    'when the source is %j, should return null',
    (source) => {
      expect(buildVideoLink(source, 10)).toBeNull();
    },
  );
});

describe('supportsTimedLink', () => {
  it('when the platform opens at the moment, should be true', () => {
    expect(supportsTimedLink('https://youtu.be/abc')).toBe(true);
    expect(supportsTimedLink('https://x.test/a.mp4')).toBe(true);
  });

  it('when the platform only opens the video, should be false', () => {
    expect(supportsTimedLink('https://outro.test/video/9')).toBe(false);
  });

  it('when the source is not a link, should be false', () => {
    expect(supportsTimedLink('nada')).toBe(false);
  });
});
