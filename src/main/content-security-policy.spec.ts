import { applyCspHeader, buildContentSecurityPolicy } from './content-security-policy';

const directive = (policy: string, name: string) =>
  policy
    .split('; ')
    .find((entry) => entry.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(' ');

const build = buildContentSecurityPolicy({ mode: 'build', devOrigins: [] });
const dev = buildContentSecurityPolicy({
  mode: 'dev',
  devOrigins: ['http://localhost:5173', 'http://localhost:5174'],
});

describe('buildContentSecurityPolicy', () => {
  it('when building for any mode, should never allow unsafe-eval', () => {
    expect(build).not.toContain('unsafe-eval');
    expect(dev).not.toContain('unsafe-eval');
  });

  it('when in build mode, should allow scripts only from the app itself', () => {
    expect(directive(build, 'script-src')).toEqual(["'self'"]);
  });

  it('when in dev mode, should also allow inline scripts for the Vite preamble', () => {
    expect(directive(dev, 'script-src')).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it('when connecting in build mode, should allow only the app itself (no local API port, no http)', () => {
    expect(directive(build, 'connect-src')).toEqual(["'self'"]);
  });

  it('when connecting in any mode, should not allow any localhost API port', () => {
    expect(build).not.toContain('localhost:3000');
    expect(dev).not.toContain('localhost:3000');
    expect(dev).not.toContain('127.0.0.1');
  });

  it('when in build mode, should not allow the dev servers or websockets', () => {
    const sources = directive(build, 'connect-src') ?? [];

    expect(sources.some((source) => source.includes(':5173') || source.startsWith('ws:'))).toBe(
      false,
    );
  });

  it('when in dev mode, should allow the dev servers and their websockets for HMR', () => {
    expect(directive(dev, 'connect-src')).toEqual(
      expect.arrayContaining([
        'http://localhost:5173',
        'ws://localhost:5173',
        'http://localhost:5174',
        'ws://localhost:5174',
      ]),
    );
  });

  it('when the app shows external images, should allow http and https images', () => {
    expect(directive(build, 'img-src')).toEqual(
      expect.arrayContaining(['https:', 'http:', 'data:']),
    );
  });

  it('when building, should block plugins and frames and restrict the base and form targets', () => {
    expect(directive(build, 'object-src')).toEqual(["'none'"]);
    expect(directive(build, 'frame-src')).toEqual(["'none'"]);
    expect(directive(build, 'base-uri')).toEqual(["'self'"]);
    expect(directive(build, 'form-action')).toEqual(["'self'"]);
    expect(directive(build, 'default-src')).toEqual(["'self'"]);
  });
});

describe('applyCspHeader', () => {
  it('when the response has no policy, should add ours and keep the other headers', () => {
    expect(applyCspHeader({ 'Content-Type': ['text/html'] }, 'default-src x')).toEqual({
      'Content-Type': ['text/html'],
      'Content-Security-Policy': ['default-src x'],
    });
  });

  it('when the response already has a policy in any letter case, should replace it', () => {
    const result = applyCspHeader(
      { 'content-security-policy': ['script-src *'], Other: ['1'] },
      'default-src x',
    );

    expect(result).toEqual({ Other: ['1'], 'Content-Security-Policy': ['default-src x'] });
  });
});
