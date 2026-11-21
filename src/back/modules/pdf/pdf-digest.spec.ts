import { buildPageDigest, PAGE_DIGEST_CHARS } from './pdf-digest';

describe('buildPageDigest', () => {
  it('when the summaries fit in the limit, should send all of them in order', () => {
    expect(buildPageDigest(['um', 'dois', 'três'], 100)).toBe('um\n\ndois\n\ntrês');
  });

  it('when there are no summaries, should answer an empty text', () => {
    expect(buildPageDigest([])).toBe('');
  });

  it('when some summaries are blank, should ignore them', () => {
    expect(buildPageDigest(['um', '   ', 'dois'], 100)).toBe('um\n\ndois');
  });

  it('when the summaries are bigger than the limit, should never pass it', () => {
    const parts = Array.from({ length: 10 }, (_, i) => `parte ${i} `.repeat(500));

    expect(buildPageDigest(parts, 1000).length).toBeLessThanOrEqual(1000);
  });

  it('when the summaries are bigger than the limit, should take a slice of every part', () => {
    const parts = ['AAA '.repeat(500), 'BBB '.repeat(500), 'CCC '.repeat(500)];

    const digest = buildPageDigest(parts, 600);

    expect(digest).toContain('AAA');
    expect(digest).toContain('BBB');
    expect(digest).toContain('CCC');
  });

  it('when cutting a part, should prefer to end at a paragraph', () => {
    const part = `${'a'.repeat(60)}\n\n${'b'.repeat(60)}\n\n${'c'.repeat(60)}`;

    const digest = buildPageDigest([part, part], 170);

    expect(digest.split('\n\n').every((piece) => /^([abc])\1*$/.test(piece))).toBe(true);
  });

  it('when no limit is given, should use the default one', () => {
    expect(buildPageDigest(['x'.repeat(PAGE_DIGEST_CHARS * 2)]).length).toBeLessThanOrEqual(
      PAGE_DIGEST_CHARS,
    );
  });
});
