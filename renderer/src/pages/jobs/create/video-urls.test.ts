import { describe, expect, it } from 'vitest';

import {
  describeLink,
  isVideoUrl,
  MAX_BATCH_LINKS,
  parseVideoUrls,
  VISIBLE_LINKS,
} from './video-urls';

describe('parseVideoUrls', () => {
  it('when the text is empty or only whitespace, should return no links', () => {
    expect(parseVideoUrls('')).toEqual([]);
    expect(parseVideoUrls('  \n \t ')).toEqual([]);
  });

  it('when there is one link, should return it trimmed', () => {
    expect(parseVideoUrls('  https://x.com/a.mp4 ')).toEqual(['https://x.com/a.mp4']);
  });

  it('when links are on separate lines, should return one per line in order', () => {
    expect(parseVideoUrls('https://x.com/a\nhttps://x.com/b\r\nhttps://x.com/c')).toEqual([
      'https://x.com/a',
      'https://x.com/b',
      'https://x.com/c',
    ]);
  });

  it('when there are blank lines between links, should ignore them', () => {
    expect(parseVideoUrls('https://x.com/a\n\n\nhttps://x.com/b\n')).toEqual([
      'https://x.com/a',
      'https://x.com/b',
    ]);
  });

  it('when a link is repeated, should keep only its first occurrence', () => {
    expect(parseVideoUrls('https://x.com/a\nhttps://x.com/b\nhttps://x.com/a')).toEqual([
      'https://x.com/a',
      'https://x.com/b',
    ]);
  });

  it('when links are separated by spaces, should split them too', () => {
    expect(parseVideoUrls('https://x.com/a https://x.com/b')).toEqual([
      'https://x.com/a',
      'https://x.com/b',
    ]);
  });

  it('when checked, should limit a batch to 50 links', () => {
    expect(MAX_BATCH_LINKS).toBe(50);
  });
});

describe('isVideoUrl', () => {
  it.each(['https://youtu.be/x', 'http://x.com/a.mp4'])(
    'when the link is %s, should accept it',
    (url) => {
      expect(isVideoUrl(url)).toBe(true);
    },
  );

  it.each(['banana', 'ftp://x.com/a', 'file:///a.mp4', ''])(
    'when the text is "%s", should reject it',
    (text) => {
      expect(isVideoUrl(text)).toBe(false);
    },
  );
});

describe('describeLink', () => {
  it('when the link has a path and query, should split the site from the rest', () => {
    expect(describeLink('https://www.youtube.com/watch?v=abc')).toEqual({
      host: 'youtube.com',
      path: '/watch?v=abc',
    });
  });

  it('when the link is only the site, should have no path', () => {
    expect(describeLink('https://vimeo.com/')).toEqual({ host: 'vimeo.com', path: '' });
  });

  it('when the text is not a link, should return it whole as the host', () => {
    expect(describeLink('banana')).toEqual({ host: 'banana', path: '' });
  });
});

describe('VISIBLE_LINKS', () => {
  it('when checked, should show 5 links before the counter', () => {
    expect(VISIBLE_LINKS).toBe(5);
  });
});
