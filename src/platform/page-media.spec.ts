import { collectMediaUrls, toMediaScan } from './page-media';

describe('collectMediaUrls', () => {
  it('when a frame has a video tag, should return its address before any iframe', () => {
    const urls = collectMediaUrls([
      { videos: [], iframes: ['https://studio.curso.edu/embed/1'] },
      { videos: ['https://cdn.curso.edu/aula.mp4'], iframes: [] },
    ]);

    expect(urls).toEqual(['https://cdn.curso.edu/aula.mp4']);
  });

  it('when there is no video tag, should fall back to the iframes', () => {
    expect(
      collectMediaUrls([{ videos: [], iframes: ['https://www.youtube.com/embed/abc'] }]),
    ).toEqual(['https://www.youtube.com/embed/abc']);
  });

  it('when addresses repeat or are blob and data, should drop them', () => {
    const urls = collectMediaUrls([
      {
        videos: [
          'blob:https://x.com/1',
          'https://a.com/v.mp4',
          'https://a.com/v.mp4',
          'data:video/mp4;base64,AA',
        ],
        iframes: [],
      },
    ]);

    expect(urls).toEqual(['https://a.com/v.mp4']);
  });

  it('when the page has nothing, should return an empty list', () => {
    expect(collectMediaUrls([])).toEqual([]);
  });
});

describe('toMediaScan', () => {
  it('when nothing was found and the page ended on a login screen, should require login', () => {
    expect(toMediaScan([], 'https://iad.login.instructure.com/discovery/1')).toEqual({
      urls: [],
      loginRequired: true,
    });
  });

  it('when a video was found, should not require login', () => {
    const scan = toMediaScan(
      [{ videos: ['https://a.com/v.mp4'], iframes: [] }],
      'https://a.com/login',
    );

    expect(scan.loginRequired).toBe(false);
  });

  it('when nothing was found on a normal page, should not require login', () => {
    expect(toMediaScan([], 'https://curso.edu/aula').loginRequired).toBe(false);
  });
});
