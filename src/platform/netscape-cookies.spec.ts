import { cookieMatchesHost, toNetscapeCookies } from './netscape-cookies';

const NOW = 1_800_000_000;

describe('toNetscapeCookies', () => {
  it('when there is a cookie, should write one tab-separated line with the Netscape fields', () => {
    const text = toNetscapeCookies(
      [
        {
          name: 'sid',
          value: 'abc',
          domain: '.curso.edu',
          path: '/aulas',
          secure: true,
          expirationDate: NOW + 100,
        },
      ],
      NOW,
    );

    expect(text).toContain(`.curso.edu\tTRUE\t/aulas\tTRUE\t${NOW + 100}\tsid\tabc\n`);
    expect(text.startsWith('# Netscape HTTP Cookie File')).toBe(true);
  });

  it('when the domain has no leading dot, should not include subdomains', () => {
    const text = toNetscapeCookies([{ name: 'a', value: 'b', domain: 'curso.edu' }], NOW);

    expect(text).toContain('curso.edu\tFALSE\t/\tFALSE\t');
  });

  it('when the cookie is HttpOnly, should prefix the domain with #HttpOnly_', () => {
    const text = toNetscapeCookies(
      [{ name: 'a', value: 'b', domain: '.curso.edu', httpOnly: true }],
      NOW,
    );

    expect(text).toContain('#HttpOnly_.curso.edu\t');
  });

  it('when the cookie is a session cookie, should give it a future expiry instead of 0', () => {
    const text = toNetscapeCookies([{ name: 'a', value: 'b', domain: '.x.com' }], NOW);
    const expiry = Number(text.trim().split('\n').at(-1)?.split('\t')[4]);

    expect(expiry).toBeGreaterThan(NOW);
  });

  it('when a cookie has no domain or name, should skip it', () => {
    const text = toNetscapeCookies(
      [
        { name: 'a', value: 'b' },
        { name: '', value: 'b', domain: '.x.com' },
      ],
      NOW,
    );

    expect(text.trim().split('\n')).toHaveLength(2);
  });
});

describe('cookieMatchesHost', () => {
  it('when the cookie domain is the host or a parent of it, should match', () => {
    expect(
      cookieMatchesHost({ name: 'a', value: 'b', domain: '.curso.edu' }, 'www.curso.edu'),
    ).toBe(true);
    expect(cookieMatchesHost({ name: 'a', value: 'b', domain: 'curso.edu' }, 'curso.edu')).toBe(
      true,
    );
  });

  it('when the domain only ends with the same letters, should not match', () => {
    expect(cookieMatchesHost({ name: 'a', value: 'b', domain: '.curso.edu' }, 'meucurso.edu')).toBe(
      false,
    );
  });

  it('when the cookie has no domain, should not match', () => {
    expect(cookieMatchesHost({ name: 'a', value: 'b' }, 'curso.edu')).toBe(false);
  });
});
