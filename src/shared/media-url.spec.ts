import { isDirectMediaUrl, isHttpUrl, isLoginPageUrl } from './media-url';

describe('isDirectMediaUrl', () => {
  it('when the link ends in a video extension, should be direct', () => {
    expect(isDirectMediaUrl('https://site.com/aulas/aula1.mp4')).toBe(true);
  });

  it('when the extension is uppercase or the link has a query string, should still be direct', () => {
    expect(isDirectMediaUrl('https://site.com/aula.MP4?token=abc')).toBe(true);
  });

  it('when the link is an audio file, should be direct', () => {
    expect(isDirectMediaUrl('https://site.com/aula.mp3')).toBe(true);
  });

  it('when the link is a platform page, should not be direct', () => {
    expect(isDirectMediaUrl('https://www.youtube.com/watch?v=abc123')).toBe(false);
  });

  it('when the link is a streaming playlist, should not be direct', () => {
    expect(isDirectMediaUrl('https://cdn.site.com/aula/index.m3u8')).toBe(false);
  });

  it('when the text is not a valid URL, should not be direct', () => {
    expect(isDirectMediaUrl('isto não é um link')).toBe(false);
  });
});

describe('isHttpUrl', () => {
  it('when the link uses https or http, should be accepted', () => {
    expect(isHttpUrl('https://a.com')).toBe(true);
    expect(isHttpUrl('http://a.com/x')).toBe(true);
  });

  it('when the link uses another protocol, should be rejected', () => {
    expect(isHttpUrl('file:///C:/video.mp4')).toBe(false);
    expect(isHttpUrl('ftp://a.com/video.mp4')).toBe(false);
  });

  it('when the text is not a URL, should be rejected', () => {
    expect(isHttpUrl('abc')).toBe(false);
  });
});

describe('isLoginPageUrl', () => {
  it('when the host or path is a login screen, should be true', () => {
    expect(isLoginPageUrl('https://iad.login.instructure.com/discovery/1')).toBe(true);
    expect(isLoginPageUrl('https://curso.edu/users/sign-in')).toBe(true);
  });

  it('when "sso" only appears inside another word or in the query, should be false', () => {
    expect(isLoginPageUrl('https://curso.edu/courses/1/pages/progresso-da-turma')).toBe(false);
    expect(isLoginPageUrl('https://curso.edu/aula?next=/login')).toBe(false);
  });

  it('when the text is not a URL, should be false', () => {
    expect(isLoginPageUrl('nada')).toBe(false);
  });
});
